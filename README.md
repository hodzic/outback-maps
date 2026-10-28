# Outback map library

Overlay maps for the [Outback](https://hodzic.github.io/outback/) app, already placed on the map.
Served with GitHub Pages at https://hodzic.github.io/outback-maps/.

In Outback: **PDF → Map library** lists the maps near the current map view; **Add** downloads one,
places it and keeps it on the phone for offline use.

## Layout

- `catalog.json`: every map: `id`, `name`, `image`, `thumb`, optional `geopdf`, `size` (bytes of the image),
  `width`, `height`, corner coordinates `topLeft`, `topRight`, `bottomLeft` (`[lat, lon]`, WGS 84),
  `source`, optional `url` and `license`, `added`, `updated`.
- `maps/<id>.jpg`: the image Outback overlays. `maps/<id>.pdf`: the same map as a GeoPDF, for Avenza, Gaia and others.
- `thumbs/<id>.jpg`: 96 × 96 preview.

## Adding a map

1. In Outback, place and align the overlay, then **PDF → Save as GeoPDF**.
2. `npm install` once, then `npm run add -- "Lake GeoPDF.pdf" --source "Who made the map" [--url …] [--license …] [--id lake]`.
   It keeps the image byte for byte, writes the GeoPDF, a thumbnail and the catalog entry (an existing id is replaced).
3. `npm run check`, commit, push. Pages publishes it in about a minute.

The site is public: only add maps that may be shared, such as US federal maps (public domain) or your own.
