# CleanSift - Beijing Case-Study Data

(Under Review) **Reassessing apparent predictive gains from data preparation: A comparative assessment procedure for measurement-based engineering estimation**

Sangbong Yoo, SeokHwan Choi, Hyein Hong, Seongbum Seo, Jisue Kim, Gyuri Lee, Haneol Cho, Chansoo Kim, and Yun Jang.

This directory provides `beijing.csv`, the fixed input used in the CleanSift Beijing air-quality analysis. It is derived from the Beijing Multi-Site Air Quality dataset and contains artificially introduced data-quality issues. The file is the input before candidate preparation operations, not a cleaned output.

## File description

| Item | Description |
| --- | --- |
| File | [`beijing.csv`](./data/beijing.csv) |
| Records | 10,000 |
| Columns | 15 |
| Prediction target | `PM2.5` |

The 14 predictor fields are `year`, `month`, `day`, `hour`, `PM10`, `SO2`, `NO2`, `CO`, `O3`, `TEMP`, `PRES`, `DEWP`, `RAIN`, and `WSPM`.

## Data handling

To reproduce the reported analysis, preserve the file's row order, column names, missing values, and nonnumeric entries. The file uses `incons` as an inconsistency marker. Loading and evaluation procedures are described in the accompanying manuscript.

## Original source and license

| Item | Information |
| --- | --- |
| Original dataset | Beijing Multi-Site Air Quality |
| Original creator listed by UCI | Song Chen |
| Source repository | UCI Machine Learning Repository, dataset 501 |
| Source page | [Beijing Multi-Site Air Quality](https://archive.ics.uci.edu/dataset/501/beijing+multi+site+air+quality+data) |
| Dataset DOI | [10.24432/C5RK5G](https://doi.org/10.24432/C5RK5G) |
| Original license | [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) |
| License for this data release | `beijing.csv` and its study-specific modifications are distributed under CC BY 4.0. This statement applies to this data file, not to other projects in the repository. |

**Modification notice.** This release contains the 10,000-record, 15-column analysis input with artificially introduced data-quality issues for the CleanSift analysis. It is not the original, unmodified UCI dataset. No endorsement by the original creator or data providers is implied.

Retain the source attribution and license link, and indicate any further changes when redistributing this file.
