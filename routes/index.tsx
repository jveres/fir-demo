/** @jsx h */
import { h } from "preact";
import { tw } from "@twind";
import Map from "../islands/Map.tsx";

export default function Home() {
  return (
    <div class={tw`p-4 mx-auto max-w-screen-lg`}>
      <Map title="FIR projections" projection="Airy" />
    </div>
  );
}