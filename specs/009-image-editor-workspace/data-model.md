# Data model: Image Editor Workspace

`State.zoom` changes from `'fit' | '100' | '200' | '400'` to `'fit' | number` (percent, 10 to 800, multiples of 10 when set by the slider or the wheel, 100 by the 100 % button). Nothing else changes: the pipeline, the steps and the results are those of feature 004.
