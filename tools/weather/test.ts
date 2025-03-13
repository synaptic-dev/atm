import weather, { getCurrentWeather } from './index';

async function testWeatherTool() {
  console.log('Testing the weather tool...\n');
  
  // Test the single-capability tool
  console.log('1. Testing single-capability tool:');
  try {
    const result = await weather.runner({
      location: 'San Francisco',
      units: 'imperial'
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing tool:', error);
  }
  
  console.log('\n2. Testing using specific capability:');
  try {
    const result = await getCurrentWeather.runner({
      location: 'Tokyo',
      units: 'metric'
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing capability:', error);
  }
}

testWeatherTool(); 