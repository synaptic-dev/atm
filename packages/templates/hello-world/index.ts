import { Tool } from "@opkt/openkit";
import { greetCapability } from "./capabilities/greet";

const tool = new Tool();

tool.addCapability(greetCapability);

export default tool;
