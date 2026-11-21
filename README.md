# PulseShield
### Proactive Biometric Video Cloaking

## 📌 Table of Contents
- About the Project
- Problem Statement
- Our Solution
- Key Features
- How It Works
- Technology Stack
- Project Demonstration
- Team Members

## 📖 About the Project

**PulseShield** is a proactive biometric video protection system designed to safeguard individuals' facial identities against unauthorized AI-based manipulation, deepfake generation, and identity misuse.

Unlike conventional deepfake detection systems that identify manipulated content after it has been created, PulseShield takes a preventive approach by protecting video content before it can be misused for AI-driven manipulation.

The system explores the use of **imperceptible, controlled perturbations in facial skin regions**, particularly within the green colour channel, to interfere with subtle physiological signals captured in video. These signals are associated with remote photoplethysmography (rPPG), which reflects blood-volume variations in facial skin.

By disrupting these subtle biometric patterns, PulseShield aims to make facial video data less suitable for certain AI-driven identity manipulation and synthesis processes while maintaining its visual appearance.

The project combines computer vision, biometric signal analysis, and privacy-oriented video processing to explore a new approach to digital identity protection.

**Our vision:** Move beyond detecting digital identity misuse towards preventing it at the source.

## ❗ Problem Statement

With the rapid advancement of generative AI, facial images and videos can be manipulated, replicated, and misused to create convincing synthetic identities without an individual's consent.

Existing deepfake detection systems primarily focus on identifying manipulated content after it has been generated or distributed. However, they do not directly address the challenge of protecting original facial video data before it becomes vulnerable to AI-driven misuse.

This creates a need for a **proactive identity protection approach** that can help safeguard facial video content against unauthorized AI manipulation, rather than relying solely on detecting misuse after it occurs.

## 💡 Our Solution

**PulseShield** introduces a proactive approach to facial identity protection by applying controlled, imperceptible perturbations to facial video data.

The system explores the use of remote photoplethysmography (rPPG), a technique that captures subtle blood-volume variations through changes in skin colour, to identify and target physiological patterns within facial videos.

By carefully modifying these subtle patterns, PulseShield aims to disrupt biometric information that AI-driven systems may rely on during facial analysis and synthesis, while preserving the video's visual quality.

Through computer vision and real-time video processing, our solution explores an additional layer of privacy protection that works before facial content can be misused.

**Our goal is to shift digital identity protection from reactive detection to proactive prevention.**

## ✨ Key Features

- **Proactive Identity Protection:** Focuses on protecting facial video data before it can be misused, rather than simply detecting manipulated content.

- **Biometric Signal Analysis:** Explores rPPG-based physiological signals by analysing subtle colour variations in facial skin regions.

- **Controlled Perturbation:** Applies carefully designed modifications to facial video signals to interfere with biometric patterns.

- **Visual Quality Preservation:** Aims to maintain the natural visual appearance of video while applying privacy-oriented modifications.

- **Real-Time Video Processing:** Provides a video-processing workflow designed to support efficient analysis and protection.

- **Interactive User Interface:** Offers a user-friendly interface for submitting video input, processing it, and viewing the resulting output.

- **Privacy-Focused Approach:** Explores an additional layer of protection against unauthorized AI-driven facial identity manipulation.

## ⚙️ How It Works

PulseShield follows a video-processing workflow that combines computer vision, facial region analysis, and biometric signal-based protection.

1. **Video Input:** The user uploads a facial video through the application interface.

2. **Frame Extraction:** The uploaded video is processed into individual frames for further analysis.

3. **Facial Region Analysis:** The system identifies facial regions, particularly skin areas suitable for analysing subtle physiological colour variations.

4. **Biometric Signal Analysis:** The system explores rPPG-related colour variations associated with blood-volume changes in facial skin.

5. **Protective Perturbation:** Controlled modifications are applied to selected facial regions to interfere with the targeted biometric patterns.

6. **Video Reconstruction:** The processed frames are combined to generate the protected video while aiming to preserve its visual appearance.

7. **Output Generation:** The user can preview and access the resulting protected video through the application.

**Result:** A privacy-oriented video output designed to make facial biometric information less useful for certain forms of unauthorized AI-driven manipulation.

## 🛠️ Technology Stack

## 🛠️ Technology Stack

| Category | Technology | Purpose |
|---|---|---|
| Programming Language | Python | Core application logic |
| Frontend / UI | Streamlit | Interactive web interface |
| Computer Vision | OpenCV | Video and frame processing |
| Numerical Computing | NumPy | Array and numerical operations |
| Signal Processing | SciPy | Biometric signal analysis |
| Image Processing | Pillow | Image handling |

### Core Concepts
- Remote Photoplethysmography (rPPG)
- Computer Vision
- Biometric Signal Processing
- Video Processing

## 🎥 Project Demonstration

## 👥 Team Members