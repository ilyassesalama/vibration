import { useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { Section } from "./Section";
import { Tabs } from "./Tabs";
import styles from "./UseIt.module.css";

const managers = [
  { value: "npm", label: "npm", code: "npm i vibration" },
  { value: "pnpm", label: "pnpm", code: "pnpm add vibration" },
  { value: "yarn", label: "yarn", code: "yarn add vibration" },
  { value: "bun", label: "bun", code: "bun add vibration" },
] as const;

const frameworks = [
  {
    value: "react",
    label: "React",
    code: `import { haptic } from "vibration";

<button onClick={() => haptic("success")}>Pay</button>`,
  },
  {
    value: "vue",
    label: "Vue",
    code: `<script setup>
import { haptic } from "vibration";
</script>

<template>
  <button @click="haptic('success')">Pay</button>
</template>`,
  },
  {
    value: "svelte",
    label: "Svelte",
    code: `<script>
  import { haptic } from "vibration";
</script>

<button onclick={() => haptic("success")}>Pay</button>`,
  },
  {
    value: "js",
    label: "JavaScript",
    code: `import { haptic } from "vibration";

button.addEventListener("click", () => haptic("success"));`,
  },
] as const;

const api = [
  { name: "haptic(input)", text: "Plays a preset, a duration or a list of pulses. Returns whether it will be felt." },
  { name: "hapticDrag(element)", text: "Lets haptic() tick at every step of a drag on that element. Returns a cleanup function." },
  { name: "cancel()", text: "Stops a pattern that is still playing." },
  { name: "engine", text: "How this browser makes haptics: vibrate, ios-relay, ios-switch or none." },
  { name: "presets", text: "The eleven built-in patterns, as pulse arrays." },
];

export function UseIt() {
  const [manager, setManager] = useState<(typeof managers)[number]["value"]>("npm");
  const [framework, setFramework] = useState<(typeof frameworks)[number]["value"]>("react");

  return (
    <Section
      id="install"
      title="Add it in two lines"
      lede="Install the package, then call haptic() from any tap handler. It works the same in every framework, with nothing to set up."
    >
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.step}>
            <h3>
              <span className={styles.number}>1</span>Install
            </h3>
            <Tabs label="Package manager" options={managers} value={manager} onChange={setManager} />
            <CodeBlock code={managers.find((option) => option.value === manager)!.code} prompt />
          </div>
          <div className={styles.step}>
            <h3>
              <span className={styles.number}>2</span>Call it from a tap
            </h3>
            <Tabs label="Framework" options={frameworks} value={framework} onChange={setFramework} />
            <CodeBlock code={frameworks.find((option) => option.value === framework)!.code} />
          </div>
        </div>
        <div className={styles.api}>
          <h3>The whole API</h3>
          <dl>
            {api.map((item) => (
              <div key={item.name}>
                <dt>
                  <code>{item.name}</code>
                </dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}
