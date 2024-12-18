import librosa
import torch
import numpy as np
import jsonify
import soundfile as sf

def transform_audio(audio_path):
    """
    Transforms an audio file into a PyTorch tensor.

    Args:
        audio_path (str): Path to the input audio file.

    Returns:
        torch.Tensor: Processed audio tensor.
    """
    audio, sr = librosa.load(audio_path, sr=None)  # Load audio with the original sample rate
    data = torch.tensor(audio, dtype=torch.float32)
    
    if len(audio) == 0:
        raise ValueError("Audio chunk is empty")
    
    return data.unsqueeze(0).unsqueeze(0)  # Add batch and channel dimensions

def split_audio(audio_path, chunk_duration=10):
    """
    Splits an audio file into chunks of a given duration.

    Args:
        audio_path (str): Path to the input audio file.
        chunk_duration (int): Duration of each chunk in seconds.

    Returns:
        list: A list of paths to the temporary audio chunks.
    """
    try:
        audio, sr = librosa.load(audio_path, sr=None)
    except Exception as e:
        return jsonify({'error': f'Failed to load audio: {str(e)}'}), 400
    chunk_samples = sr * chunk_duration

    chunks = []
    for i in range(0, len(audio), chunk_samples):
        chunk = audio[i:i + chunk_samples]
        chunk_path = f"temp_chunk_{i // chunk_samples}.wav"
        sf.write(chunk_path, chunk, sr)
        chunks.append(chunk_path)

    return chunks
