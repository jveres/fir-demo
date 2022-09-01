/** @jsx h */
import { h } from "preact";
import { asset } from "$fresh/runtime.ts";
import { tw } from "@twind";
import { useEffect, useRef, useState } from "preact/hooks";
import * as bertin from "https://esm.sh/bertin@0.13.5";
import * as d3geoprojections from "https://esm.sh/d3-geo-projection@4.0.0";
import * as topojson from "https://esm.sh/topojson-client@3.1.0";
import {
  FeatureCollection,
  Geometry,
} from "https://esm.sh/v92/@types/geojson@7946.0.10/index.d.ts";
import { Topology } from "https://esm.sh/v92/@types/topojson-specification@1.0.2/index.d.ts";

const projections = [
  "Airy",
  "Aitoff",
  "Armadillo",
  "August",
  "Baker",
  "Berghaus",
  "Bertin1953",
  "Boggs",
  "Bonne",
  "Bottomley",
  "Bromley",
  "Craster",
  "CylindricalEqualArea",
  "Eckert3",
  "Eisenlohr",
  "Laskowski",
  "Nicolosi",
];

export type Projection = typeof projections[number];

interface MapProps {
  title: string;
  projection: Projection;
}

export default function Map(props: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [world, setWorld] = useState<Topology>();
  const [worldfirs, setWorldFirs] = useState<Topology>();
  const [projection, setProjection] = useState<Projection>(props.projection);

  useEffect(() => {
    fetch("/world.json").then((resp) => resp.json().then(setWorld));
    fetch("/worldfirs.json").then((resp) => resp.json().then(setWorldFirs));
  }, []);

  useEffect(() => {
    if (
      world === undefined || worldfirs === undefined || projection === undefined
    ) {
      return;
    }

    const firsAt = function (fl: number) {
      /* This function picks all the FIR at a given flight level */
      const firs = topojson.feature(
        worldfirs,
        worldfirs.objects.data,
      ) as FeatureCollection;
      const fixStitch = function (geometry: Geometry) {
        const a = d3geoprojections.geoStitch(geometry);
        a.type = "Polygon";
        a.coordinates = a.coordinates.flat();
        return a;
      };
      firs.features = firs.features
        .filter(
          (elt) =>
            elt.properties?.lower <= fl &&
            fl < (elt.properties?.upper ? elt.properties.upper : 999),
        )
        .map((elt) =>
          Object({
            type: "Feature",
            properties: {
              ...elt.properties,
              // add an empty string if the designator is empty (NO_FIR areas)
              designator: elt.properties?.designator
                ? elt.properties.designator
                : "",
            },
            // Fix that bug for geoStitch
            geometry: elt.properties?.designator === "NZZO"
              ? fixStitch(elt.geometry)
              : d3geoprojections.geoStitch(elt.geometry),
          })
        );
      return firs;
    };

    const firs100 = firsAt(100);
    const firs = {
      type: "FeatureCollection",
      features: firs100.features.filter(
        (d) => d.properties?.type !== "NO_FIR",
      ),
    };
    const noFirs = {
      type: "FeatureCollection",
      features: firs100.features.filter(
        (d) => d.properties?.type === "NO_FIR",
      ),
    };

    const geoProjection =
      (d3geoprojections as { [key: string]: CallableFunction })[
        `geo${projection}`
      ];

    const map = bertin.draw({
      params: {
        projection: geoProjection(),
        clip: true,
      },
      layers: [
        {
          type: "layer",
          geojson: firs,
          fill: "#aaa",
          fillOpacity: 0.3,
          strokeWidth: 1.5,
          tooltip: ["$name"],
        },
        {
          type: "layer",
          geojson: noFirs,
          fill: {
            type: "typo",
            values: "name",
          },
          fillOpacity: 0.3,
          tooltip: ["No FIR"],
        },
        {
          type: "layer",
          geojson: world,
          fill: {
            type: "typo",
            values: "region",
          },
        },
        {
          type: "shadow",
          geojson: world,
          opacity: 0.2,
        },
        { type: "outline" },
        { type: "graticule" },
      ],
    });
    mapRef.current?.append(map);
    return () => map.remove();
  }, [world, worldfirs, projection]);

  return (
    <div class={tw`my-10`}>
      <div class={tw`flex gap-2 w-full`}>
        <p class={tw`flex-grow-1 font-bold text-xl`}>{props.title}</p>
        <select
          value={projection}
          onChange={({ target }) =>
            setProjection((target as HTMLSelectElement).value)}
        >
          {projections.map((value) => (
            <option value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div class={tw`my-10`}>
        {!world || !worldfirs
          ? <img src={asset("/loading.gif")} width="64" height="64" />
          : <div class={tw`flex w-full`} ref={mapRef}></div>}
      </div>
    </div>
  );
}
