# Third-party material

## Exercise library: Free Exercise DB

The exercise library (names, muscles, equipment, levels, instructions and the exercise photos) comes from
[Free Exercise DB](https://github.com/yuhonas/free-exercise-db) by Yuhonas, itself derived from
[wrkout/exercises.json](https://github.com/wrkout/exercises.json) by Ollie Jennings.

- License: [The Unlicense](https://unlicense.org/) (public domain dedication). No attribution is required; it is given here anyway.
- The app bundles the text (`apps/mobile-web/src/data/exercise-catalog.json`, built by `apps/mobile-web/scripts/build-catalog.mjs`).
- The photos are **not** bundled. The app loads them from the jsDelivr CDN, pinned to commit
  `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5` of the dataset.

**Note on the photos:** the dataset and its upstream project declare the Unlicense for the whole repository but do not document
where the photographs originally came from. If you plan to distribute or sell this app commercially, check the provenance of the
images yourself, or replace them with your own.
