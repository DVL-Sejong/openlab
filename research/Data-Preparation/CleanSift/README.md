# CleanSift - Beijing Case-Study Data

This directory provides `beijing.csv`, the fixed analysis input used in the Beijing air-quality case study in the following manuscript:

(Under Review) **Reassessing apparent predictive gains from data preparation: A comparative assessment procedure for measurement-based engineering estimation**

Sangbong Yoo, SeokHwan Choi, Hyein Hong, Seongbum Seo, Jisue Kim, Gyuri Lee, Haneol Cho, Chansoo Kim, and Yun Jang.

The file is provided so that readers can start from the same input used in the reported Beijing analysis. It is a semi-synthetic input based on recorded air-quality observations with artificially introduced data-quality issues. It is not the unmodified source dataset, a cleaned output, or an error-free reference dataset.

## Included file

| File | Description |
| --- | --- |
| [`beijing.csv`](./data/beijing.csv) | Fixed Beijing analysis input before the candidate preparation operations evaluated in the manuscript. Existing missing values and inconsistent entries are retained. |

The input described in Appendix D contains **10,000 records and 15 columns**. The prediction target is `PM2.5`. The 14 predictor fields are `year`, `month`, `day`, `hour`, `PM10`, `SO2`, `NO2`, `CO`, `O3`, `TEMP`, `PRES`, `DEWP`, `RAIN`, and `WSPM`. This list identifies the fields and does not prescribe a new column order.

## Using the analysis input

Use the deposited file as the starting input for the Beijing case study in Section 6.3.1. Preserve its row order, column names, missing values, and nonnumeric entries. Do not apply the separate controlled-perturbation procedure for the five benchmark datasets to this file.

The manuscript's Beijing loading and evaluation procedure uses the following conventions:

- The loader maps the literal token `incons` to `__INCONSISTENT__`.
- Ten-fold partitions are formed from all 10,000 input rows using `KFold(n_splits=10, shuffle=True, random_state=42)` before candidate preparation operations.
- Records with invalid targets are excluded from model fitting and predictive evaluation within each fold. Target values are not imputed. The manuscript reports 8,279 records with valid numeric targets.

Do not remove invalid-target rows before forming the folds, because that changes the partitioning used in the reported analysis. Candidate-specific preparation and training-derived predictor completion are then applied as described in the manuscript.

Section 6.3.1 and Appendix D describe the Beijing evaluation. Section 4.3 and Appendices A and C provide the shared predictive and distributional assessment settings.

## Scope of this data release

This directory distributes only the Beijing case-study input. It does not redistribute the Bike Sharing, Forest Fires, Diabetes, ETTm1, or Gas Sensor Array experimental inputs. Their public source datasets are cited in the manuscript, and Appendix D documents their input selection, preprocessing, controlled perturbation rules, and random seeds. The ETTm1 application analysis uses the public source input without synthetic perturbation.

## Original source, attribution, and license

**Before public release, replace the fields below with the confirmed source and applicable license information.**

| Item | Information |
| --- | --- |
| Original dataset | [CONFIRM exact dataset title] |
| Original creator(s) | [CONFIRM original creator or attribution parties] |
| Original source URL or DOI | [CONFIRM dataset-specific URL or DOI, not only the repository homepage] |
| Original license and license link | [CONFIRM license name, version, and URL] |
| Distribution terms for `beijing.csv` | [CONFIRM applicable terms for this modified analysis input and retain required original notices] |

**Modification notice.** The deposited file is a study-specific analysis input derived from recorded Beijing air-quality observations. It contains 10,000 records and the 15 analysis variables listed above, together with artificially introduced data-quality issues. It should not be presented as the original provider's unmodified dataset. Credit for the underlying observations remains with the original data providers.
