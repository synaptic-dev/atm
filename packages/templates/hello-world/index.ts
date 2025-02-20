import { Tool } from '@synaptic-ai/atm';
import { greetCapability } from './capabilities/greet';

const tool = new Tool();

tool.addCapability(greetCapability);

export default tool;
