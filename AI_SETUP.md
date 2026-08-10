# AI Photo Tagging Setup

Currently, the `/api/analyze-image` endpoint in `server/index.js` is **mocked**. It returns a hardcoded array of tags (`#golden-crust`, `#crumb`, etc.) when an image is uploaded.

## How to Enable Real Gemini AI Vision

To use the actual Google Gemini 1.5 Flash model for real image analysis, follow these steps:

1. **Get an API Key**: Go to Google AI Studio (https://aistudio.google.com/) and create a free API key.
2. **Update `.env.production`**: Add your API key to the backend environment file:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. **Update `server/index.js`**:
   Replace the mocked `/api/analyze-image` route with the following code:

   ```javascript
   app.post('/api/analyze-image', requireAdmin, async (req, res) => {
     const { imageUrl } = req.body;
     if (!imageUrl) return res.status(400).json({ error: 'Image URL required' });
     
     try {
       // Fetch the image as a buffer
       const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
       const buffer = Buffer.from(response.data, 'binary');
       
       const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
       
       const prompt = "Analyze this baking photo. Return a JSON array of 4-5 relevant descriptive hashtags (e.g. ['#sourdough', '#crumb', '#overproofed']). Return ONLY the JSON array, nothing else.";
       
       const image = {
         inlineData: {
           data: buffer.toString("base64"),
           mimeType: "image/jpeg",
         },
       };
       
       const result = await model.generateContent([prompt, image]);
       const responseText = result.response.text();
       
       // Parse the JSON array from the response
       const tags = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
       
       res.json({ tags });
     } catch (err) {
       console.error("Gemini Error:", err);
       res.status(500).json({ error: 'Failed to analyze image' });
     }
   });
   ```

*(Note: The Gemini 1.5 Flash tier is free up to 15 requests per minute, which is more than enough for a personal cookbook!)*
