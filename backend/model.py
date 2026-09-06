"""
LoanLens - Loan Risk Prediction Model
======================================

This script trains an XGBoost model using the LendingClub dataset.

IMPORTANT DESIGN DECISION
-------------------------
The LendingClub accepted-loans dataset does not contain a genuine
"approved vs rejected application" target.

Instead, it contains loans that were issued and later received an outcome.

Therefore, this model predicts:

    0 = Good outcome (Fully Paid)
    1 = Bad outcome (Charged Off / Default)

The model produces a DEFAULT PROBABILITY.

The application layer will later convert that probability into:

    APPROVE
    REVIEW
    REJECT

This separation makes the system more realistic and gives us the
ability to change decision thresholds without retraining the model.

Run from:
    Loan AI/backend/

Command:
    python model.py
"""

# ============================================================
# 1. IMPORTS
# ============================================================

import os
import json
import warnings
import joblib

import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OrdinalEncoder
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)

warnings.filterwarnings("ignore")


# ============================================================
# 2. CONFIGURATION
# ============================================================

# Dataset location relative to backend/
DATASET_PATH = "../dataset/accepted_loans.csv"

# All trained model artifacts will be saved here.
MODEL_DIR = "models"

# ------------------------------------------------------------
# DEVELOPMENT / FINAL TRAINING SIZE
# ------------------------------------------------------------
#
# While developing:
#     SAMPLE_SIZE = 200000
#
# This makes it much faster to repeatedly retrain the model.
#
# For the FINAL model:
#     SAMPLE_SIZE = None
#
# This uses all eligible LendingClub rows.
#
# Your laptop has already successfully processed a large
# portion of this dataset, so we can use the full dataset for
# the final training run once the pipeline is finalized.
# ------------------------------------------------------------

SAMPLE_SIZE = 200000

# Reproducibility
RANDOM_STATE = 42

# Test set percentage
TEST_SIZE = 0.20


# Create model directory if it doesn't exist.
os.makedirs(MODEL_DIR, exist_ok=True)


# ============================================================
# 3. INPUT FEATURES
# ============================================================
#
# These are characteristics that can reasonably be known
# around the time a loan is originated.
#
# We deliberately avoid columns that describe events occurring
# after the loan was issued.
#
# This helps prevent data leakage.
# ============================================================

NUMERIC_FEATURES = [
    "loan_amnt",
    "int_rate",
    "installment",
    "annual_inc",
    "dti",
    "fico_range_low",
    "fico_range_high",
    "open_acc",
    "pub_rec",
    "revol_bal",
    "revol_util",
    "total_acc",
    "delinq_2yrs",
    "inq_last_6mths",
    "mort_acc",
    "pub_rec_bankruptcies",
]

CATEGORICAL_FEATURES = [
    "term",
    "emp_length",
    "home_ownership",
    "verification_status",
    "purpose",
]

# Everything we need from the CSV.
COLUMNS_NEEDED = NUMERIC_FEATURES + CATEGORICAL_FEATURES + [
    "loan_status",
]


# ============================================================
# 4. HELPER FUNCTIONS
# ============================================================

def clean_percentage_column(series):
    """
    Convert percentage strings such as:

        '15.5%'

    into:

        15.5

    Invalid values become NaN.
    """

    return pd.to_numeric(
        series.astype(str)
        .str.replace("%", "", regex=False)
        .str.strip(),
        errors="coerce",
    )


def clean_term(series):
    """
    Convert LendingClub term values such as:

        ' 36 months'
        ' 60 months'

    into:

        36
        60
    """

    return pd.to_numeric(
        series.astype(str)
        .str.extract(r"(\d+)")[0],
        errors="coerce",
    )


def clean_emp_length(series):
    """
    Convert employment length values such as:

        '< 1 year'  -> 0
        '1 year'    -> 1
        '5 years'   -> 5
        '10+ years' -> 10

    Missing / invalid values become NaN.
    """

    def convert(value):

        if pd.isna(value):
            return np.nan

        value = str(value).strip()

        if "< 1" in value:
            return 0

        if "10+" in value:
            return 10

        digits = "".join(character for character in value if character.isdigit())

        if digits:
            return int(digits)

        return np.nan

    return series.apply(convert)


def print_section(title):
    """
    Pretty console separator.
    """

    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


# ============================================================
# 5. LOAD DATASET
# ============================================================

print_section("STEP 1 - LOADING DATASET")

print("Dataset path:")
print(os.path.abspath(DATASET_PATH))

print("\nLoading LendingClub dataset...")
print("This can take a little while because the CSV is large.\n")


# Read only the columns we actually need.
df = pd.read_csv(
    DATASET_PATH,
    usecols=COLUMNS_NEEDED,
    low_memory=False,
)


print(f"Rows loaded: {len(df):,}")
print(f"Columns loaded: {len(df.columns)}")


# ============================================================
# 6. CREATE THE RISK TARGET
# ============================================================

print_section("STEP 2 - CREATING TARGET VARIABLE")

"""
Target definition:

    0 = GOOD
        Fully Paid

    1 = BAD
        Charged Off
        Default

We are predicting the probability of a bad loan outcome.

This means:

    model.predict_proba(...)[..., 1]

will represent estimated default risk.
"""

GOOD_STATUS = [
    "Fully Paid",
]

BAD_STATUS = [
    "Charged Off",
    "Default",
]


# Keep only statuses with a clear outcome.
df = df[
    df["loan_status"].isin(GOOD_STATUS + BAD_STATUS)
].copy()


# Create binary target.
df["target"] = df["loan_status"].apply(
    lambda status: 1 if status in BAD_STATUS else 0
)


# Remove original status.
df.drop(columns=["loan_status"], inplace=True)


print(f"Rows after target filtering: {len(df):,}")

print("\nTarget distribution:")

target_counts = df["target"].value_counts()

print(target_counts)

print("\nTarget proportions:")

print(
    df["target"]
    .value_counts(normalize=True)
    .sort_index()
)


# ============================================================
# 7. SAMPLE DATA DURING DEVELOPMENT
# ============================================================

print_section("STEP 3 - SELECTING TRAINING DATA")

if SAMPLE_SIZE is not None and len(df) > SAMPLE_SIZE:

    print(
        f"Sampling {SAMPLE_SIZE:,} rows "
        "while preserving the class distribution..."
    )

    # IMPORTANT:
    # train_test_split returns:
    #
    #     first value  -> requested training sample
    #     second value -> remaining rows
    #
    # We want the first value here.

    df, _ = train_test_split(
        df,
        train_size=SAMPLE_SIZE,
        stratify=df["target"],
        random_state=RANDOM_STATE,
    )

    df = df.reset_index(drop=True)

    print(
        f"Rows selected for training: {len(df):,}"
    )

else:

    print(
        "Using ALL eligible rows for training."
    )

    print(f"Rows selected for training: {len(df):,}")


# ============================================================
# 8. CLEAN NUMERIC FEATURES
# ============================================================

print_section("STEP 4 - CLEANING FEATURES")

print("Cleaning numeric and categorical columns...")


# ------------------------------------------------------------
# 8.1 Percentage columns
# ------------------------------------------------------------

df["int_rate"] = clean_percentage_column(
    df["int_rate"]
)

df["revol_util"] = clean_percentage_column(
    df["revol_util"]
)


# ------------------------------------------------------------
# 8.2 Loan term
# ------------------------------------------------------------

df["term"] = clean_term(
    df["term"]
)


# ------------------------------------------------------------
# 8.3 Employment length
# ------------------------------------------------------------

df["emp_length"] = clean_emp_length(
    df["emp_length"]
)


# ------------------------------------------------------------
# 8.4 Credit score
# ------------------------------------------------------------
#
# LendingClub gives us a lower and upper FICO range.
#
# Example:
#
#     fico_range_low  = 690
#     fico_range_high = 694
#
# We convert that into:
#
#     credit_score = 692
#
# This gives our frontend one clean credit-score field.
# ------------------------------------------------------------

df["credit_score"] = (
    df["fico_range_low"] +
    df["fico_range_high"]
) / 2


# We no longer need the original two FICO columns.
df.drop(
    columns=[
        "fico_range_low",
        "fico_range_high",
    ],
    inplace=True,
)


# ============================================================
# 9. FEATURE ENGINEERING
# ============================================================

print_section("STEP 5 - FEATURE ENGINEERING")

"""
We create a few useful financial ratios.

These are calculated only from information available at
application/origination time.

They can help the model understand financial burden better
than the raw values alone.
"""


# ------------------------------------------------------------
# 9.1 Loan-to-income ratio
# ------------------------------------------------------------
#
# Example:
#
# Loan amount = $20,000
# Annual income = $60,000
#
# Loan-to-income = 0.333
#
# This represents the loan amount as a fraction of annual
# income.
# ------------------------------------------------------------

df["loan_to_income"] = (
    df["loan_amnt"] /
    df["annual_inc"].replace(0, np.nan)
)


# ------------------------------------------------------------
# 9.2 Monthly income
# ------------------------------------------------------------

df["monthly_income"] = (
    df["annual_inc"] / 12
)


# ------------------------------------------------------------
# 9.3 Installment-to-income ratio
# ------------------------------------------------------------

df["installment_to_income"] = (
    df["installment"] /
    df["monthly_income"].replace(0, np.nan)
)


# ------------------------------------------------------------
# 9.4 Credit utilization
# ------------------------------------------------------------
#
# revol_util already represents revolving credit utilization.
#
# We keep it as a direct feature because it is useful for
# explaining risk later with SHAP.
# ------------------------------------------------------------


# ------------------------------------------------------------
# 9.5 Total credit activity
# ------------------------------------------------------------

df["total_credit_accounts"] = (
    df["open_acc"].fillna(0) +
    df["total_acc"].fillna(0)
)


# ============================================================
# 10. HANDLE MISSING VALUES
# ============================================================

print_section("STEP 6 - HANDLING MISSING VALUES")

"""
We use median imputation for numeric features.

Why?

A loan application may legitimately have a missing value
for something like mort_acc.

Dropping every row containing a missing value can remove a
large amount of useful data.

Median imputation is simple, stable, and easy to reproduce.

For categorical features, we replace missing values with
the explicit category:

    "Unknown"
"""

# ------------------------------------------------------------
# Numeric features after feature engineering
# ------------------------------------------------------------

NUMERIC_FEATURES_FINAL = [
    "loan_amnt",
    "term",
    "int_rate",
    "installment",
    "annual_inc",
    "dti",
    "open_acc",
    "pub_rec",
    "revol_bal",
    "revol_util",
    "total_acc",
    "delinq_2yrs",
    "inq_last_6mths",
    "mort_acc",
    "pub_rec_bankruptcies",
    "credit_score",
    "loan_to_income",
    "monthly_income",
    "installment_to_income",
    "total_credit_accounts",
    "emp_length"
]


# ------------------------------------------------------------
# Categorical features
# ------------------------------------------------------------

CATEGORICAL_FEATURES_FINAL = [
    "home_ownership",
    "verification_status",
    "purpose",
]


# ------------------------------------------------------------
# Convert numeric columns
# ------------------------------------------------------------

for column in NUMERIC_FEATURES_FINAL:

    df[column] = pd.to_numeric(
        df[column],
        errors="coerce",
    )


# ------------------------------------------------------------
# Replace invalid infinite values
# ------------------------------------------------------------

df.replace(
    [np.inf, -np.inf],
    np.nan,
    inplace=True,
)


# ------------------------------------------------------------
# Numeric median imputation
# ------------------------------------------------------------

for column in NUMERIC_FEATURES_FINAL:

    median_value = df[column].median()

    df[column] = df[column].fillna(
        median_value
    )


# ------------------------------------------------------------
# Categorical missing values
# ------------------------------------------------------------

for column in CATEGORICAL_FEATURES_FINAL:

    df[column] = (
        df[column]
        .astype(str)
        .replace(
            {
                "nan": "Unknown",
                "None": "Unknown",
            }
        )
        .fillna("Unknown")
    )


# ============================================================
# 11. REMOVE EXTREME INVALID VALUES
# ============================================================

print_section("STEP 7 - VALIDATING FINANCIAL VALUES")

"""
We remove clearly invalid values.

We are NOT aggressively deleting legitimate outliers.

The goal is simply to prevent impossible values from entering
the model.
"""


# Annual income must be positive.
df = df[
    df["annual_inc"] > 0
].copy()


# Loan amount must be positive.
df = df[
    df["loan_amnt"] > 0
].copy()


# Interest rate should be non-negative.
df = df[
    df["int_rate"] >= 0
].copy()


# DTI should not be negative.
df = df[
    df["dti"] >= 0
].copy()


# Credit score should be within a reasonable range.
df = df[
    (df["credit_score"] >= 300) &
    (df["credit_score"] <= 900)
].copy()


# Revolving utilization cannot logically be negative.
df = df[
    df["revol_util"] >= 0
].copy()


print(
    f"Rows remaining after validation: {len(df):,}"
)


# ============================================================
# 12. CREATE FINAL FEATURE MATRIX
# ============================================================

print_section("STEP 8 - PREPARING MODEL FEATURES")

FEATURE_COLUMNS = (
    NUMERIC_FEATURES_FINAL +
    CATEGORICAL_FEATURES_FINAL
)


X = df[FEATURE_COLUMNS].copy()

y = df["target"].copy()


print(f"Number of final features: {len(FEATURE_COLUMNS)}")

print("\nFinal feature list:")

for index, feature in enumerate(FEATURE_COLUMNS, start=1):

    print(
        f"{index:2d}. {feature}"
    )


# ============================================================
# 13. TRAIN / TEST SPLIT
# ============================================================

print_section("STEP 9 - TRAIN / TEST SPLIT")

"""
We use a stratified split.

This ensures that the proportion of default and non-default
loans remains approximately the same in both sets.
"""

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=TEST_SIZE,
    stratify=y,
    random_state=RANDOM_STATE,
)


print(
    f"Training rows: {len(X_train):,}"
)

print(
    f"Testing rows:  {len(X_test):,}"
)


print("\nTraining class distribution:")

print(
    y_train.value_counts(
        normalize=True
    ).sort_index()
)


# ============================================================
# 14. CATEGORICAL ENCODING
# ============================================================

print_section("STEP 10 - ENCODING CATEGORICAL FEATURES")

"""
XGBoost needs numeric input.

We therefore encode categorical values into integer
representations.

We use OrdinalEncoder rather than LabelEncoder because
OrdinalEncoder is intended for feature columns and allows
unknown categories at prediction time.

This is important later when the React application sends a
category that was not present in the training sample.
"""

encoder = OrdinalEncoder(
    handle_unknown="use_encoded_value",
    unknown_value=-1,
    encoded_missing_value=-1,
)


# Fit the encoder ONLY on training data.
#
# This prevents information from the test set from leaking
# into preprocessing.

X_train = X_train.copy()
X_test = X_test.copy()


X_train[CATEGORICAL_FEATURES_FINAL] = encoder.fit_transform(
    X_train[CATEGORICAL_FEATURES_FINAL]
)


X_test[CATEGORICAL_FEATURES_FINAL] = encoder.transform(
    X_test[CATEGORICAL_FEATURES_FINAL]
)


# Make sure everything is numeric.
X_train = X_train.astype(float)
X_test = X_test.astype(float)


print("Categorical encoding complete.")


# ============================================================
# 15. CALCULATE CLASS BALANCE
# ============================================================

print_section("STEP 11 - CALCULATING CLASS BALANCE")

"""
Our positive class is:

    1 = Default / Charged Off

This is the minority class.

XGBoost's scale_pos_weight parameter is designed for
imbalanced classification.

A standard starting point is:

    negative_count / positive_count

which gives more importance to the minority positive class.
"""

negative_count = int(
    (y_train == 0).sum()
)

positive_count = int(
    (y_train == 1).sum()
)


scale_pos_weight = (
    negative_count /
    positive_count
)


print(f"Good loans (class 0): {negative_count:,}")
print(f"Bad loans  (class 1): {positive_count:,}")

print(
    f"\nCalculated scale_pos_weight: "
    f"{scale_pos_weight:.4f}"
)


# ============================================================
# 16. TRAIN XGBOOST MODEL
# ============================================================

print_section("STEP 12 - TRAINING XGBOOST MODEL")

"""
Model configuration is intentionally moderate.

We do NOT need an enormous model.

The goal is:

    good predictive performance
    +
    fast prediction
    +
    fast SHAP explanations
    +
    stable behavior

The model will later run live when the user submits an
application.
"""

print("Training model...")
print("This may take a few minutes.\n")


model = xgb.XGBClassifier(

    # Number of boosting trees
    n_estimators=350,

    # Maximum tree depth
    max_depth=6,

    # Learning rate
    learning_rate=0.05,

    # Row subsampling
    subsample=0.90,

    # Feature subsampling
    colsample_bytree=0.90,

    # Minimum child weight
    min_child_weight=3,

    # L2 regularization
    reg_lambda=1.0,

    # L1 regularization
    reg_alpha=0.0,

    # Handle class imbalance
    scale_pos_weight=scale_pos_weight,

    # Binary classification
    objective="binary:logistic",

    # Evaluation metric
    eval_metric="logloss",

    # Reproducibility
    random_state=RANDOM_STATE,

    # Use all available CPU threads
    n_jobs=-1,
)


# Train.
model.fit(
    X_train,
    y_train,
)


print("\nXGBoost training completed.")


# ============================================================
# 17. MODEL PREDICTIONS
# ============================================================

print_section("STEP 13 - GENERATING TEST PREDICTIONS")

"""
The model outputs:

    probability of class 1

where:

    class 1 = Default / Charged Off

Therefore:

    0.05 → approximately 5% estimated default probability
    0.25 → approximately 25%
    0.70 → approximately 70%

These probabilities will become the central "Risk Score"
shown in our future frontend.
"""

y_probability = model.predict_proba(
    X_test
)[:, 1]


# For evaluation only, use the conventional 0.50 threshold.
#
# IMPORTANT:
#
# This is NOT going to be our final APPROVE / REVIEW / REJECT
# business threshold.
#
# The frontend decision engine will be built separately.

y_prediction = (
    y_probability >= 0.50
).astype(int)


# ============================================================
# 18. EVALUATE MODEL
# ============================================================

print_section("STEP 14 - MODEL EVALUATION")

accuracy = accuracy_score(
    y_test,
    y_prediction,
)

roc_auc = roc_auc_score(
    y_test,
    y_probability,
)

pr_auc = average_precision_score(
    y_test,
    y_probability,
)

precision = precision_score(
    y_test,
    y_prediction,
    zero_division=0,
)

recall = recall_score(
    y_test,
    y_prediction,
    zero_division=0,
)

f1 = f1_score(
    y_test,
    y_prediction,
    zero_division=0,
)


print("Overall metrics:\n")

print(
    f"Accuracy : {accuracy:.4f}"
)

print(
    f"ROC-AUC  : {roc_auc:.4f}"
)

print(
    f"PR-AUC   : {pr_auc:.4f}"
)

print(
    f"Precision: {precision:.4f}"
)

print(
    f"Recall   : {recall:.4f}"
)

print(
    f"F1 Score : {f1:.4f}"
)


# ============================================================
# 19. CLASSIFICATION REPORT
# ============================================================

print_section("STEP 15 - CLASSIFICATION REPORT")

print(
    classification_report(
        y_test,
        y_prediction,
        target_names=[
            "Fully Paid",
            "Default / Charged Off",
        ],
        zero_division=0,
    )
)


# ============================================================
# 20. CONFUSION MATRIX
# ============================================================

print_section("STEP 16 - CONFUSION MATRIX")

cm = confusion_matrix(
    y_test,
    y_prediction,
)


print(
    "\n                 Predicted"
)

print(
    "                 Good    Bad"
)

print(
    f"Actual Good     {cm[0, 0]:6d}  {cm[0, 1]:6d}"
)

print(
    f"Actual Bad      {cm[1, 0]:6d}  {cm[1, 1]:6d}"
)


# ============================================================
# 21. SAVE MODEL
# ============================================================

print_section("STEP 17 - SAVING MODEL ARTIFACTS")

"""
These files will later be loaded by FastAPI.

We deliberately save the preprocessing encoder separately
from the model.

That means the exact same preprocessing used during training
can be applied to new applications submitted through React.
"""


# ------------------------------------------------------------
# Save XGBoost model
# ------------------------------------------------------------

model_path = os.path.join(
    MODEL_DIR,
    "xgb_model.pkl",
)

joblib.dump(
    model,
    model_path,
)


# ------------------------------------------------------------
# Save categorical encoder
# ------------------------------------------------------------

encoder_path = os.path.join(
    MODEL_DIR,
    "categorical_encoder.pkl",
)

joblib.dump(
    encoder,
    encoder_path,
)


# ------------------------------------------------------------
# Save feature list
# ------------------------------------------------------------

feature_columns_path = os.path.join(
    MODEL_DIR,
    "feature_columns.pkl",
)

joblib.dump(
    FEATURE_COLUMNS,
    feature_columns_path,
)


# ------------------------------------------------------------
# Save numeric and categorical feature lists
# ------------------------------------------------------------

feature_config = {
    "numeric_features": NUMERIC_FEATURES_FINAL,
    "categorical_features": CATEGORICAL_FEATURES_FINAL,
    "feature_columns": FEATURE_COLUMNS,
}


feature_config_path = os.path.join(
    MODEL_DIR,
    "feature_config.json",
)


with open(
    feature_config_path,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        feature_config,
        file,
        indent=4,
    )


# ============================================================
# 22. SAVE SHAP BACKGROUND DATA
# ============================================================

print_section("STEP 18 - SAVING SHAP BACKGROUND DATA")

"""
SHAP will later be used by the FastAPI backend to explain
individual predictions.

We do NOT need to save the entire training dataset for SHAP.

A small representative sample is enough for the explainer's
background/reference data.

This keeps the application lightweight.
"""

SHAP_BACKGROUND_SIZE = min(
    300,
    len(X_train),
)


shap_background = X_train.sample(
    n=SHAP_BACKGROUND_SIZE,
    random_state=RANDOM_STATE,
)


background_path = os.path.join(
    MODEL_DIR,
    "background_sample.csv",
)


shap_background.to_csv(
    background_path,
    index=False,
)


print(
    f"Saved {SHAP_BACKGROUND_SIZE} rows "
    "for future SHAP explanations."
)


# ============================================================
# 23. SAVE MODEL METADATA
# ============================================================

print_section("STEP 19 - SAVING MODEL METADATA")

"""
The metadata file lets the backend know exactly which model
version and configuration produced a prediction.

This becomes useful for our Audit Trail later.
"""

metadata = {

    "model_name": "LoanLens XGBoost Risk Model",

    "model_type": "XGBoost Classifier",

    "version": "1.0",

    "target": {
        "0": "Fully Paid",
        "1": "Default / Charged Off",
    },

    "training_rows": int(len(X_train)),

    "test_rows": int(len(X_test)),

    "feature_count": int(len(FEATURE_COLUMNS)),

    "features": FEATURE_COLUMNS,

    "scale_pos_weight": float(
        scale_pos_weight
    ),

    "evaluation": {
        "accuracy": float(accuracy),
        "roc_auc": float(roc_auc),
        "pr_auc": float(pr_auc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
    },

    "random_state": RANDOM_STATE,

    "test_size": TEST_SIZE,

    "sample_size": (
        None
        if SAMPLE_SIZE is None
        else SAMPLE_SIZE
    ),
}


metadata_path = os.path.join(
    MODEL_DIR,
    "model_metadata.json",
)


with open(
    metadata_path,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        metadata,
        file,
        indent=4,
    )


# ============================================================
# 24. FINAL SUMMARY
# ============================================================

print_section("MODEL TRAINING COMPLETE")

print("Saved files:\n")

print(
    f"✓ {model_path}"
)

print(
    f"✓ {encoder_path}"
)

print(
    f"✓ {feature_columns_path}"
)

print(
    f"✓ {feature_config_path}"
)

print(
    f"✓ {background_path}"
)

print(
    f"✓ {metadata_path}"
)


print("\nFinal model performance:")

print(
    f"ROC-AUC : {roc_auc:.4f}"
)

print(
    f"PR-AUC  : {pr_auc:.4f}"
)

print(
    f"Accuracy: {accuracy:.4f}"
)

print(
    f"Recall  : {recall:.4f}"
)

print(
    f"F1      : {f1:.4f}"
)


print("\nModel is ready for the FastAPI backend.")

print(
    "\nIMPORTANT:"
)

print(
    "The model predicts DEFAULT RISK."
)

print(
    "APPROVE / REVIEW / REJECT thresholds will be "
    "implemented separately in the application layer."
)

print("\nDone.")