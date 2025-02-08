const greetings = {
  en: "Hello",
  es: "Hola",
  fr: "Bonjour"
};

export async function runner(input: { name?: string; language?: "en" | "es" | "fr" }) {
  const { name = "World", language = "en" } = input;
  
  return {
    message: `${greetings[language]}, ${name}!`,
    timestamp: new Date().toISOString()
  };
} 