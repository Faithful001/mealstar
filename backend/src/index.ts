const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 8080; //  chose port from here like 8080, 3001
const api = require("./data/db.json");

const app = express();

app.use(express.json());

app.use(cors());

const jsonData = api;

app.get("/api/data", (req: any, res: any) => {
	res.status(200).json(jsonData);
});

app.get("/api/data/:id", (req: any, res: any) => {
	try {
		const { id } = req.params;
		const meal = jsonData.meals;

		const item = meal.find((item: any) => item.id == parseInt(id));
		if (!item) {
			res.status(404).json({ error: "meal not found" });
		} else {
			res.status(200).json(item);
		}
	} catch (error) {
		res.status(500).json({ error: "An error occured" });
	}
});

app.listen(port, () => {
	console.log(`JSON server is running at http://localhost:${port}`);
});
