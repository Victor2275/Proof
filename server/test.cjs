const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://sugarspunrun.com/best-cheesecake-recipe/', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(res => {
  const $ = cheerio.load(res.data);
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const objs = Array.isArray(json) ? json : (json['@graph'] || [json]);
      objs.forEach(o => {
        if (o['@type'] === 'Recipe' || (Array.isArray(o['@type']) && o['@type'].includes('Recipe'))) {
          console.log("INSTRUCTIONS:");
          console.log(JSON.stringify(o.recipeInstructions, null, 2));
        }
      });
    } catch(e) {}
  });
});
