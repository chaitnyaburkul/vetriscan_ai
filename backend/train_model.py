"""
VetriScan AI — Standalone Model Training Script
Run this to retrain the model from scratch.
Usage: python train_model.py
"""
import os
import numpy as np
import matplotlib.pyplot as plt
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Model
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from sklearn.utils.class_weight import compute_class_weight

# ── Config ─────────────────────────────────────────────────────
DATASET_PATH = r"D:\Lumpy Skin Images Dataset"   # <-- change if needed
MODEL_SAVE   = os.path.join(os.path.dirname(__file__), "assets", "cattle_disease_model.h5")
IMG_SIZE     = (224, 224)
BATCH_SIZE   = 16
EPOCHS       = 40

os.makedirs(os.path.dirname(MODEL_SAVE), exist_ok=True)

print("=" * 60)
print("VetriScan AI — MobileNetV2 Transfer Learning")
print(f"Dataset : {DATASET_PATH}")
print(f"Save to : {MODEL_SAVE}")
print("=" * 60)

# ── Data ────────────────────────────────────────────────────────
train_gen = ImageDataGenerator(
    rescale=1./255, validation_split=0.2,
    rotation_range=30, width_shift_range=0.2, height_shift_range=0.2,
    shear_range=0.15, zoom_range=0.25, horizontal_flip=True,
    brightness_range=[0.7, 1.3], channel_shift_range=20.0, fill_mode="nearest",
).flow_from_directory(DATASET_PATH, target_size=IMG_SIZE, batch_size=BATCH_SIZE,
                      class_mode="binary", subset="training", shuffle=True)

val_gen = ImageDataGenerator(rescale=1./255, validation_split=0.2
).flow_from_directory(DATASET_PATH, target_size=IMG_SIZE, batch_size=BATCH_SIZE,
                      class_mode="binary", subset="validation", shuffle=False)

print(f"Classes : {train_gen.class_indices}")
print(f"Train   : {train_gen.samples}  |  Val: {val_gen.samples}")

cw = compute_class_weight("balanced", classes=np.unique(train_gen.classes), y=train_gen.classes)
class_weight = dict(enumerate(cw))
print(f"Weights : {class_weight}")

# ── Model ───────────────────────────────────────────────────────
base = MobileNetV2(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
base.trainable = False

x = GlobalAveragePooling2D()(base.output)
x = BatchNormalization()(x)
x = Dense(256, activation="relu")(x)
x = Dropout(0.5)(x)
x = Dense(64, activation="relu")(x)
x = Dropout(0.3)(x)
out = Dense(1, activation="sigmoid")(x)
model = Model(base.input, out)
model.compile(Adam(0.001), "binary_crossentropy", ["accuracy"])

best_ckpt = MODEL_SAVE.replace(".h5", "_best.h5")
cb1 = [EarlyStopping("val_accuracy", patience=5, restore_best_weights=True, verbose=1),
       ReduceLROnPlateau("val_loss", factor=0.5, patience=3, min_lr=1e-6, verbose=1),
       ModelCheckpoint(best_ckpt, "val_accuracy", save_best_only=True, verbose=1)]

print("\n[Phase 1] Training top layers...")
h1 = model.fit(train_gen, epochs=15, validation_data=val_gen,
               class_weight=class_weight, callbacks=cb1, verbose=1)

print("\n[Phase 2] Fine-tuning last 50 layers...")
for layer in base.layers[-50:]:
    layer.trainable = True
model.compile(Adam(5e-5), "binary_crossentropy", ["accuracy"])

cb2 = [EarlyStopping("val_accuracy", patience=8, restore_best_weights=True, verbose=1),
       ReduceLROnPlateau("val_loss", factor=0.3, patience=4, min_lr=1e-7, verbose=1),
       ModelCheckpoint(best_ckpt, "val_accuracy", save_best_only=True, verbose=1)]

h2 = model.fit(train_gen, epochs=EPOCHS, validation_data=val_gen,
               class_weight=class_weight, callbacks=cb2, verbose=1)

# Load best and save
from tensorflow.keras.models import load_model
best = load_model(best_ckpt)
best.save(MODEL_SAVE)
print(f"\nModel saved to: {MODEL_SAVE}")

acc     = h1.history["accuracy"]     + h2.history["accuracy"]
val_acc = h1.history["val_accuracy"] + h2.history["val_accuracy"]
print(f"Best Val Accuracy : {max(val_acc)*100:.2f}%")
print(f"Best Train Accuracy: {max(acc)*100:.2f}%")

# Plot
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
axes[0].plot(acc, label="Train"); axes[0].plot(val_acc, label="Val")
axes[0].set_title("Accuracy"); axes[0].legend(); axes[0].grid(True)
axes[1].plot(h1.history["loss"]+h2.history["loss"], label="Train")
axes[1].plot(h1.history["val_loss"]+h2.history["val_loss"], label="Val")
axes[1].set_title("Loss"); axes[1].legend(); axes[1].grid(True)
plt.tight_layout()
plt.savefig(os.path.join(os.path.dirname(__file__), "assets", "training_results.png"))
print("Training graph saved.")
