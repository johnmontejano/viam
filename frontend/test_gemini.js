import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const apiKey = "AIzaSyCsLY9EXVsZLNBd6xmEdJlraApdugMBOvc";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run() {
  try {
    const result = await model.generateContent("Hello!");
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}
run();
