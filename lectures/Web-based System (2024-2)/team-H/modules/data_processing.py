import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import mne
from mne.preprocessing import ICA

# Global Variables
channels = ['AF3', 'F7', 'F3', 'FC5', 'T7', 'P7', 'O1', 'O2', 'P8', 'T8', 'FC6', 'F4', 'F8', 'AF4']
freq_bands = {
    'delta': (0.5, 4),
    'theta': (4, 8),
    'alpha': (8, 13),
    'beta': (13, 30),
    'gamma': (30, 63.9)
}

def drop_nan(df):
    """Remove NaN values."""
    return df.dropna(axis=0)

def create_raw_array(df, sfreq=128):
    """Create MNE RawArray object."""
    info = mne.create_info(ch_names=channels, sfreq=sfreq, ch_types='eeg')
    raw = mne.io.RawArray(df[channels].T, info)
    return raw

def apply_high_pass_filter(raw, l_freq=1, h_freq=40):
    """Apply high-pass filter."""
    raw.filter(l_freq, h_freq, fir_design='firwin')
    return raw

def apply_notch_filter(raw, freqs=50.0):
    """Apply notch filter to remove line noise."""
    raw.notch_filter(freqs=freqs)
    return raw

def apply_ica(raw, n_components=14, random_state=64):
    """Apply ICA to remove artifacts."""
    ica = ICA(n_components=n_components, random_state=random_state, max_iter=1000)
    ica.fit(raw)
    ica.apply(raw)
    return raw

def set_average_reference(raw):
    """Set EEG average reference."""
    raw.set_eeg_reference('average')
    return raw

def normalize_data(df):
    """Normalize data using Min-Max scaling."""
    scaler = MinMaxScaler(feature_range=(0, 1))
    df[channels] = scaler.fit_transform(df[channels])
    return df

def extract_frequency_bands(raw):
    """Extract specific frequency bands and return as DataFrame."""
    band_data = {}
    for band, (l_freq, h_freq) in freq_bands.items():
        band_raw = raw.copy().filter(l_freq, h_freq, fir_design='firwin')
        band_data[band] = pd.DataFrame(band_raw.get_data().T, columns=channels)
    return band_data

def preprocess_eeg(df, use_fft=False):
    """
    Main preprocessing function.
    Handles NaN removal, filtering, artifact removal, and normalization.
    """
    if len(df) == 0:
        return None
    
    # Step 1: Remove NaN
    df = drop_nan(df)

    # Step 2: Create MNE RawArray
    raw = create_raw_array(df)

    # Step 3: Apply filters
    raw = apply_high_pass_filter(raw)
    raw = apply_notch_filter(raw)

    # Step 4: Remove artifacts with ICA
    raw = apply_ica(raw)

    # Step 5: Set average reference
    raw = set_average_reference(raw)

    if use_fft:
        # Extract frequency bands if FFT preprocessing is required
        band_data = extract_frequency_bands(raw)
        # Normalize each band
        for band in freq_bands.keys():
            band_data[band] = normalize_data(band_data[band])
        return band_data

    # Step 6: Convert back to DataFrame and normalize
    df = pd.DataFrame(raw.get_data().T, columns=channels)
    df = normalize_data(df)
    return df

def preprocess_with_options(df, preprocessing_steps, use_fft=False):
    """
    Perform selected preprocessing steps based on the provided options.

    Parameters:
    - df: Pandas DataFrame containing raw EEG data.
    - preprocessing_steps: List of preprocessing steps to apply (e.g., ["drop_nan", "high_pass_filter"]).
    - use_fft: Boolean indicating whether to extract frequency bands.

    Returns:
    - Processed DataFrame or frequency band data (if use_fft=True).
    """
    if len(df) == 0:
        return None

    raw = None
    df = drop_nan(df)
    raw = create_raw_array(df)

    if raw is not None:
        if "high_pass_filter" in preprocessing_steps:
            raw = apply_high_pass_filter(raw)

        if "remove line noise" in preprocessing_steps:
            raw = apply_notch_filter(raw)

        if "remove artifact" in preprocessing_steps:
            raw = apply_ica(raw)

        if "평균 재참조" in preprocessing_steps:
            raw = set_average_reference(raw)

        if use_fft:
            band_data = extract_frequency_bands(raw)
            if "normalize" in preprocessing_steps:
                for band in freq_bands.keys():
                    band_data[band] = normalize_data(band_data[band])
            return band_data

        # Convert back to DataFrame after RawArray processing
        df = pd.DataFrame(raw.get_data().T, columns=channels)

    if "Min-Max 정규화" in preprocessing_steps:
        df = normalize_data(df)

    return df
