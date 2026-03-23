import cv2
import numpy as np
from collections import deque
import time
import urllib.request
import os

# MediaPipe 0.10+ imports
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import RunningMode, FaceLandmarkerOptions, FaceLandmarker
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe import Image, ImageFormat

# Model download helper
def ensure_model_exists():
    """Download face landmarker model if it doesn't exist"""
    model_name = 'face_landmarker.task'
    model_path = os.path.join(os.path.expanduser('~'), '.mediapipe', 'models', model_name)
    
    if not os.path.exists(model_path):
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        print(f"Downloading face landmarker model to {model_path}...")
        url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
        try:
            urllib.request.urlretrieve(url, model_path)
            print("Model downloaded successfully!")
        except Exception as e:
            print(f"Warning: Could not download model: {e}")
            print("Attempting to use built-in model...")
            return None
    return model_path

# ==========================================
# CONFIGURATION
# ==========================================
class Config:
    WEBCAM_INDEX = 0
    WINDOW_NAME = "Real-Time Attention Pipeline"
    SCORE_SMOOTHING_WINDOW = 30
    FRAME_RATE_TARGET = 30
    
    WEIGHT_HEAD = 0.4
    WEIGHT_GAZE = 0.4
    WEIGHT_BLINK = 0.2

    THRESHOLD_LOW = 40
    THRESHOLD_HIGH = 80

# ==========================================
# UTILS & MATH
# ==========================================
def calculate_ear(eye_landmarks):
    A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
    B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
    C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
    ear = (A + B) / (2.0 * C)
    return ear

def get_head_pose(landmarks, image_shape):
    h, w, _ = image_shape
    idxs = [1, 152, 33, 263, 61, 291] 
    points_2d = np.array([[landmarks[i].x * w, landmarks[i].y * h] for i in idxs], dtype=np.float64)

    points_3d = np.array([
        [0, 0, 0], [0, -60, -70], [-30, -20, -50],
        [30, -20, -50], [-20, 40, -50], [20, 40, -50]
    ], dtype=np.float64)

    focal_length = 1.0 * w
    cam_matrix = np.array([
        [focal_length, 0, w/2],
        [0, focal_length, h/2],
        [0, 0, 1]
    ])
    dist_coeffs = np.zeros((4, 1))

    try:
        _, rot_vec, trans_vec = cv2.solvePnP(points_3d, points_2d, cam_matrix, dist_coeffs)
        rotation_matrix, _ = cv2.Rodrigues(rot_vec)
        
        pitch = np.arctan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
        yaw = np.arctan2(-rotation_matrix[2, 0], np.sqrt(rotation_matrix[2, 1]**2 + rotation_matrix[2, 2]**2))
        roll = np.arctan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
        
        return np.degrees([pitch, yaw, roll])
    except:
        return [0, 0, 0]

# ==========================================
# PIPELINE COMPONENTS
# ==========================================
class AttentionScorer:
    def __init__(self):
        self.score_history = deque(maxlen=Config.SCORE_SMOOTHING_WINDOW)
        self.blink_count = 0
        self.last_ear = 0.3
        self.is_blinking = False

    def update(self, head_angles, gaze_deviation, ear):
        head_deviation = abs(head_angles[0]) + abs(head_angles[1]) 
        head_score = max(0, 100 - (head_deviation * 2.5))
        gaze_score = max(0, 100 - (gaze_deviation * 400))

        if ear < 0.2 and not self.is_blinking:
            self.is_blinking = True
            self.blink_count += 1
        elif ear > 0.25:
            self.is_blinking = False
            
        if len(self.score_history) % 30 == 0:
            self.blink_count = 0
            
        blink_score = 100 if self.blink_count < 4 else max(0, 100 - (self.blink_count * 10))

        raw_score = (
            Config.WEIGHT_HEAD * head_score +
            Config.WEIGHT_GAZE * gaze_score +
            Config.WEIGHT_BLINK * blink_score
        )

        self.score_history.append(raw_score)
        return np.mean(self.score_history)

class AdaptiveEngine:
    def __init__(self):
        self.last_state = "Normal"
        self.last_trigger = 0

    def get_recommendation(self, score):
        now = time.time()
        if now - self.last_trigger < 3.0:
            return self.last_state, ""

        state = "Normal"
        msg = ""

        if score < Config.THRESHOLD_LOW:
            state = "⚠️ Disengaged"
            msg = "Suggestion: Simplify content or take a break."
            self.last_trigger = now
        elif score > Config.THRESHOLD_HIGH:
            state = "🚀 Flow State"
            msg = "Suggestion: Increase difficulty or pacing."
            self.last_trigger = now
            
        self.last_state = state
        return state, msg

# ==========================================
# MAIN EXECUTION
# ==========================================
def main():
    print("--- Starting Attention Pipeline ---")
    print("Privacy Note: Video is processed locally. Nothing is saved.")
    print("Press 'q' to exit.\n")
    
    # Ensure model exists
    model_path = ensure_model_exists()

    cap = cv2.VideoCapture(Config.WEBCAM_INDEX)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    # Initialize Face Landmarker (MediaPipe 0.10+)
    try:
        base_options = BaseOptions(model_asset_path=model_path) if model_path else BaseOptions()
        options = FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5
        )
        detector = FaceLandmarker.create_from_options(options)
        print("Face Landmarker initialized successfully!")
    except Exception as e:
        print(f"Error initializing Face Landmarker: {e}")
        print("Make sure you have an internet connection to download the model.")
        return

    scorer = AttentionScorer()
    engine = AdaptiveEngine()

    LEFT_IRIS = 468
    RIGHT_IRIS = 473
    LEFT_EYE = [33, 160, 158, 133, 153, 144]
    RIGHT_EYE = [362, 385, 387, 263, 373, 374]

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            continue

        image_h, image_w, _ = frame.shape
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Convert to MediaPipe Image
        mp_image = Image(image_format=ImageFormat.SRGB, data=image_rgb)
        
        # Detect face landmarks
        detection_result = detector.detect(mp_image)
        
        attention_score = 50.0
        state_text = "Searching..."
        rec_text = ""

        if detection_result.face_landmarks:
            landmarks_list = detection_result.face_landmarks[0]
            
            # Create landmark accessor class for compatibility
            class LandmarkWrapper:
                def __init__(self, lm_list):
                    self.landmarks = lm_list
                    
                def __getitem__(self, idx):
                    class LM:
                        pass
                    lm = LM()
                    lm.x = self.landmarks[idx].x
                    lm.y = self.landmarks[idx].y
                    lm.z = self.landmarks[idx].z if hasattr(self.landmarks[idx], 'z') else 0
                    return lm
            
            landmarks = LandmarkWrapper(landmarks_list)

            head_angles = get_head_pose(landmarks, frame.shape)

            l_eye_pts = np.array([[landmarks[i].x, landmarks[i].y] for i in LEFT_EYE])
            r_eye_pts = np.array([[landmarks[i].x, landmarks[i].y] for i in RIGHT_EYE])
            ear_left = calculate_ear(l_eye_pts)
            ear_right = calculate_ear(r_eye_pts)
            avg_ear = (ear_left + ear_right) / 2

            l_eye_center = (np.array([landmarks[33].x, landmarks[33].y]) + np.array([landmarks[133].x, landmarks[133].y])) / 2
            l_iris = np.array([landmarks[LEFT_IRIS].x, landmarks[LEFT_IRIS].y])
            gaze_dev_left = np.linalg.norm(l_iris - l_eye_center)

            r_eye_center = (np.array([landmarks[362].x, landmarks[362].y]) + np.array([landmarks[263].x, landmarks[263].y])) / 2
            r_iris = np.array([landmarks[RIGHT_IRIS].x, landmarks[RIGHT_IRIS].y])
            gaze_dev_right = np.linalg.norm(r_iris - r_eye_center)

            avg_gaze_dev = (gaze_dev_left + gaze_dev_right) / 2

            attention_score = scorer.update(head_angles, avg_gaze_dev, avg_ear)
            state_text, rec_text = engine.get_recommendation(attention_score)

            # Draw landmarks using new API
            try:
                from mediapipe.tasks.python.vision import FaceLandmarksConnections
                annotated_image = frame.copy()
                
                # Draw face landmarks
                h, w, _ = frame.shape
                for connection in FaceLandmarksConnections.FACE_CONNECTIONS:
                    start_idx, end_idx = connection
                    if start_idx < len(landmarks_list) and end_idx < len(landmarks_list):
                        start = landmarks_list[start_idx]
                        end = landmarks_list[end_idx]
                        start_pos = (int(start.x * w), int(start.y * h))
                        end_pos = (int(end.x * w), int(end.y * h))
                        cv2.line(annotated_image, start_pos, end_pos, (0, 255, 0), 1)
                
                frame = annotated_image
            except Exception as e:
                pass
            
            cv2.circle(frame, (int(l_iris[0]*image_w), int(l_iris[1]*image_h)), 3, (255, 0, 0), -1)
            cv2.circle(frame, (int(r_iris[0]*image_w), int(r_iris[1]*image_h)), 3, (255, 0, 0), -1)

        # UI Overlay
        bar_width = int((attention_score / 100) * 300)
        cv2.rectangle(frame, (10, 40), (310, 60), (50, 50, 50), -1)
        color_bar = (0, 0, 255) if attention_score < Config.THRESHOLD_LOW else (0, 255, 0)
        cv2.rectangle(frame, (10, 40), (10 + bar_width, 60), color_bar, -1)
        
        cv2.putText(frame, f"Attention Score: {attention_score:.1f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, f"Status: {state_text}", (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        if rec_text:
            cv2.putText(frame, rec_text, (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        cv2.putText(frame, "Press 'q' to Quit", (10, image_h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        cv2.imshow(Config.WINDOW_NAME, frame)

        if cv2.waitKey(5) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("--- Pipeline Stopped ---")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user.")