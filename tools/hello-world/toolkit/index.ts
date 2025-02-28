import { Toolkit } from '@synaptic-ai/toolmaker';

import clock from './tools/clock';
import usaClock from './tools/usa-clock';


// Assemble and export the complete toolkit
export const toolkit = new Toolkit({
  tools: [clock, usaClock]
});


export default toolkit; 