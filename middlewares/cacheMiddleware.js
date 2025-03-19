const redisClient = require("../utils/redisClient");

const cacheMiddleware = async (req, res, next) => {
  try {
    if (!redisClient) {
      console.error("❌ Redis client is not initialized");
      return next(); // Proceed without caching
    }

    const cacheKey = req.originalUrl; // Use request URL as cache key
    const expiryTime = 36000; // 10 hours (in seconds)

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache hit for ${cacheKey}`);
      return res.json(JSON.parse(cachedData)); // Return cached response
    }

    // Override res.json to cache responses
    res.sendResponse = res.json;
    res.json = async (body) => {
      await redisClient.set(cacheKey, JSON.stringify(body), "EX", expiryTime); // Set 10-hour expiry
      res.sendResponse(body);
    };

    next();
  } catch (error) {
    console.error("❌ Redis caching error:", error);
    next();
  }
};

module.exports = cacheMiddleware;
