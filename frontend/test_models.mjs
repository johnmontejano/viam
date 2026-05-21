import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyCsLY9EXVsZLNBd6xmEdJlraApdugMBOvc";
const genAI = new GoogleGenerativeAI(apiKey);

async function tryModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello!");
    console.log(modelName, "SUCCESS");
  } catch (e) {
    console.error(modelName, "FAILED:", e.message);
  }
}

async function run() {
  await tryModel("gemini-1.5-flash");
  await tryModel("gemini-1.5-flash-latest");
  await tryModel("gemini-1.5-pro");
}
run();
