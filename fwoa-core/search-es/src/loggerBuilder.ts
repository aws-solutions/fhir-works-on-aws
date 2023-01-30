import { makeLogger } from "fhir-works-on-aws-interface";

const componentLogger = makeLogger({
  component: "search",
});

export default function getComponentLogger(): any {
  return componentLogger;
}
