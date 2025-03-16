import { Tool } from '@opkt/toolmaker';
import { greetCapability } from './capabilities/greet';

const tool = new Tool();

tool.addCapability(greetCapability);

export default tool;
