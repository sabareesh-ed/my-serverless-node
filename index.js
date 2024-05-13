import express, { urlencoded } from "express";
import dotenv from 'dotenv';
import axios from "axios";
import cors from 'cors';
import { rateLimit } from 'express-rate-limit'
dotenv.config();

const app = express();
app.use(cors({
  origin: 'https://jies-animation-site.webflow.io',
  optionsSuccessStatus: 200
}))
app.use(express.json());
app.use(urlencoded({extended: true}));
const limiter = rateLimit({
	windowMs: 60 * 1000, // 1 minutes
	limit: 60, // Limit each IP to 100 requests per `window` (here, per 1 minute).
	standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  message: "Too many requests from this IP, please try again later",
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)

const baseURL = `https://api.webflow.com/v2/collections`;

let hostItemLikes = new Map();

app.post('/clearref', (req, res) => {
  const currHost = req.headers.host;
  console.log(currHost, " ", hostItemLikes );
  if (hostItemLikes.has(currHost)) {
    hostItemLikes.delete(currHost);
    console.log(`Data cleared for host: ${currHost}`);
    res.status(200).json({ message: "Data cleared successfully for " + currHost });
  }
});


app.post("/items/like", async (req, res)=>{
  console.log(req.body);
  const itemid = req.body.itemID;
  const currHost = req.headers.host;


  if (!hostItemLikes.has(currHost)) {
    hostItemLikes.set(currHost, new Set()); // If the host doesn't exist in the map, create a new Set for it
  }

  let itemsLikedByHost = hostItemLikes.get(currHost);

  if (itemsLikedByHost.has(itemid)) {
    return res.status(403).json({ message: "You have already liked this item." });
  } else {
    itemsLikedByHost.add(itemid); // Add the itemID to the Set associated with the current host
    try{
      const getItemResponse = await axios.get(baseURL+ `/${process.env.WEBFLOW_COLLECTION_LIST_ID}/items/${itemid}`,{
        headers:{
          Authorization: `Bearer ${process.env.WEBFLOW_API_KEY}`,
          "Content-Type": "application/json"
        }
      });
  
      const itemData = getItemResponse.data;
      var updatedLikes = itemData.fieldData.likes + 1;
      itemData.fieldData.likes = updatedLikes;
  
      const updateItemResponse = await axios.patch(baseURL+ `/${process.env.WEBFLOW_COLLECTION_LIST_ID}/items/${itemid}/live`,itemData,{
        headers:{
          Authorization: `Bearer ${process.env.WEBFLOW_API_KEY}`,
          "Content-Type": "application/json"
        }
      });
  
      res.status(200).json(updateItemResponse.data);
      
    }catch(error){
      console.error(error.message);
    }
  }
    
})

app.post("/items/dislike", async (req, res)=>{
  console.log(req.body);
  const itemid = req.body.itemID;
  const currHost = req.headers.host;

  if (!hostItemLikes.has(currHost)) {
    hostItemLikes.set(currHost, new Set()); // If the host doesn't exist in the map, create a new Set for it
  }

  let itemsLikedByHost = hostItemLikes.get(currHost);
  if (!itemsLikedByHost.has(itemid)) {
    return res.status(403).json({ message: "You cannot dislike an item you haven't liked yet." });
  } else {
    itemsLikedByHost.delete(itemid); // Remove the itemID from the Set associated with the current host
    try{
      const getItemResponse = await axios.get(baseURL+ `/${process.env.WEBFLOW_COLLECTION_LIST_ID}/items/${itemid}`,{
        headers:{
          Authorization: `Bearer ${process.env.WEBFLOW_API_KEY}`,
          "Content-Type": "application/json"
        }
      });
  
      const itemData = getItemResponse.data;
      var updatedLikes = Math.max(0, itemData.fieldData.likes - 1);;
      itemData.fieldData.likes = updatedLikes;
  
      const updateItemResponse = await axios.patch(baseURL+ `/${process.env.WEBFLOW_COLLECTION_LIST_ID}/items/${itemid}/live`,itemData,{
        headers:{
          Authorization: `Bearer ${process.env.WEBFLOW_API_KEY}`,
          "Content-Type": "application/json"
        }
      });
  
      res.status(200).json(updateItemResponse.data);
      
    }catch(error){
      console.error(error.message);
    }
  }
})

app.listen(8080, function() {
  console.log("Server is running on 8080");
});
