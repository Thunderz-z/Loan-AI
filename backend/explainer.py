"""
LoanLens - SHAP Explainer Module
=================================

This module loads the trained XGBoost model and calculates 
exact feature contributions (Shapley values) for any given prediction.

By using the background dataset and model_output="probability",
the SHAP values are returned as actual percentage impacts on the risk score,
rather than abstract log-odds.
"""

import os
import joblib
import numpy as np
import pandas as pd
import shap

# ============================================================
# 1. CONFIGURATION
# ============================================================

MODEL_DIR = "models"


class RiskExplainer:
    """
    Singleton class to hold the model and SHAP explainer in memory.
    This prevents reloading the model from disk on every API call.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RiskExplainer, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        print("Loading SHAP explainer and model artifacts...")
        
        # Load the trained XGBoost model
        self.model = joblib.load(os.path.join(MODEL_DIR, "xgb_model.pkl"))
        
        # Load the feature column names in the exact training order
        self.feature_columns = joblib.load(os.path.join(MODEL_DIR, "feature_columns.pkl"))
        
        # Load the categorical encoder (needed to reverse-lookup categories if necessary)
        self.encoder = joblib.load(os.path.join(MODEL_DIR, "categorical_encoder.pkl"))
        
        # Load the background dataset
        # We use this to calculate SHAP values in PROBABILITY space instead of log-odds.
        background_data = pd.read_csv(os.path.join(MODEL_DIR, "background_sample.csv"))
        
        # Initialize the TreeExplainer
        self.explainer = shap.TreeExplainer(
            self.model,
            data=background_data,
            feature_perturbation="interventional",
            model_output="probability"
        )
        
        # Extract the base expected value (average risk of the background dataset)
        self.base_value = float(self.explainer.expected_value)
        
        print(f"SHAP initialized. Base average risk: {self.base_value * 100:.2f}%")

    def explain_prediction(self, preprocessed_df, original_features_dict):
        """
        Calculates feature contributions for a single applicant.
        
        Args:
            preprocessed_df (pd.DataFrame): 1-row DataFrame containing the 
                                            encoded/scaled features exactly 
                                            as the model expects.
            original_features_dict (dict): The human-readable inputs before 
                                           preprocessing (e.g., {"term": "36 months"}).
                                           Used to display context on the frontend.
                                           
        Returns:
            dict: JSON-ready dictionary containing the base value, final risk, 
                  and a sorted list of feature contributions.
        """
        # Ensure the columns are in the exact order the model expects
        preprocessed_df = preprocessed_df[self.feature_columns]
        
        # Calculate SHAP values for the single row
        # shap_values returns a matrix; we take the first (and only) row
        shap_values = self.explainer.shap_values(preprocessed_df)[0]
        
        # Calculate the final predicted probability to verify the math
        final_risk = self.base_value + np.sum(shap_values)
        
        # Format the explanations for the frontend chart (Recharts)
        contributions = []
        
        for i, feature_name in enumerate(self.feature_columns):
            impact = float(shap_values[i])
            
            # We only send meaningful contributions to the frontend to keep the chart clean
            # (Ignore features that moved the probability by less than 0.1%)
            if abs(impact) > 0.001:
                # Grab the original human-readable value if available, else use preprocessed
                display_value = original_features_dict.get(
                    feature_name, 
                    float(preprocessed_df.iloc[0, i])
                )
                
                contributions.append({
                    "feature": feature_name,
                    "value": display_value,
                    "contribution": impact
                })
                
        # Sort by absolute impact (highest impact features at the top of the waterfall)
        contributions = sorted(contributions, key=lambda x: abs(x["contribution"]), reverse=True)
        
        return {
            "base_risk": self.base_value,
            "final_risk": final_risk,
            "top_factors": contributions
        }

# Instantiate a global instance so FastAPI can import this directly
risk_explainer = RiskExplainer()


# ============================================================
# 2. LOCAL TESTING SCRIPT
# ============================================================
if __name__ == "__main__":
    print("\n--- Testing Explainer ---")
    
    # 1. Grab a single row from the background data to act as a mock "new applicant"
    mock_df = pd.read_csv(os.path.join(MODEL_DIR, "background_sample.csv")).head(1)
    
    # 2. Create a mock dictionary of original inputs (how the frontend would send it)
    mock_original_inputs = mock_df.to_dict(orient="records")[0]
    
    # 3. Run the explainer
    explanation = risk_explainer.explain_prediction(mock_df, mock_original_inputs)
    
    print("\nResulting Explanation Payload:")
    print(f"Base Average Risk : {explanation['base_risk'] * 100:.2f}%")
    print(f"Final Applicant Risk: {explanation['final_risk'] * 100:.2f}%\n")
    print("Feature Contributions:")
    for factor in explanation["top_factors"][:5]: # Show top 5
        sign = "+" if factor['contribution'] > 0 else ""
        print(f"  {factor['feature']} (value: {factor['value']}): {sign}{factor['contribution'] * 100:.2f}%")