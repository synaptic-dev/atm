import { Tool } from '@synaptic-ai/toolmaker';
import { greetCapability } from './capabilities/greet';

const tool = new Tool({
  name: 'Hello World',
  description: 'A simple tool to demonstrate ATM capabilities'
});

tool.addCapability(greetCapability);

export default tool;
