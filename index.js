import express from "express";
import path from "path";
import session from "express-session";
import flash from "connect-flash";
import fs from "fs";
import hbs from "hbs";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { sequelize } from "./models/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({ secret: process.env.SESSION_SECRET || "xianfire-secret-key", resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: "lax" } }));
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.currentUser = req.session.userName;
  res.locals.currentRole = req.session.role;
  res.locals.canReview = ["staff", "technician", "admin"].includes(req.session.role);
  res.locals.isAdmin = req.session.role === "admin";
  next();
});

app.engine("xian", hbs.__express);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");
const partialsDir = path.join(__dirname, "views", "partials");
for (const file of fs.readdirSync(partialsDir)) {
  if (file.endsWith(".xian")) hbs.registerPartial(path.basename(file, ".xian"), fs.readFileSync(path.join(partialsDir, file), "utf8"));
}

app.use("/", router);
app.use((req, res) => res.status(404).render("home", { title: "Page not found" }));
app.use((error, _req, res, _next) => {
  console.error("Application error:", error);
  res.status(500).render("home", { title: "Something went wrong" });
});

export default app;

if (!process.env.ELECTRON) {
  sequelize.sync().then(() => app.listen(port, () => console.log(`AgriSystem running at http://localhost:${port}`))).catch((error) => {
    console.error("Unable to connect to MySQL. Start MySQL and check models/db.js.", error.message);
  });
}
