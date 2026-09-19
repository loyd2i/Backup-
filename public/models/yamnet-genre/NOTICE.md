# YAMNet (converted to TensorFlow.js)

Source: https://github.com/tensorflow/models/tree/master/research/audioset/yamnet
License: Apache License 2.0 (https://github.com/tensorflow/models/blob/master/LICENSE)
Weights: https://storage.googleapis.com/audioset/yamnet.h5

Converted from the original Keras `.h5` weights to a TensorFlow.js graph model
using `tensorflowjs_converter`. No modification to the model architecture or
weights themselves — only the export format changed. The original model
predicts 521 AudioSet classes; this app filters that output to a curated
subset of music-genre-relevant labels for style detection at upload time.
