const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());

// Non è più necessaria la funzione getBrowser separata, la logica è integrata nella route

app.get("/", (req, res) => {
    res.send("✅ Il server è attivo! Usa /checkAvailability per verificare la disponibilità.");
});

app.get("/checkAvailability", async (req, res) => {
    const { checkIn, checkOut, apartment } = req.query;

    if (!checkIn || !checkOut || !apartment) {
        return res.status(400).json({ error: "Check-in, Check-out e il tipo di appartamento sono obbligatori" });
    }

    const url = `https://www.casaneifiori.it/risultati-di-ricerca/?mphb_check_in_date=<span class="math-inline">\{checkIn\}&mphb\_check\_out\_date\=</span>{checkOut}&mphb_adults=1&mphb_children=0`;

    let browser;
    try {
        console.log(`🔍 Controllo disponibilità per: ${apartment} | Check-in: ${checkIn}, Check-out: ${checkOut}`);

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Opzioni necessarie
            //  timeout: 60000 // Opzionale: Aumenta il timeout se necessario (in millisecondi)
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

        const availableRooms = await page.evaluate(() => {
            const roomElements = document.querySelectorAll(".mphb-room-type-title a");
            return Array.from(roomElements).map(el => el.innerText.trim());
        });

        console.log(`🏨 Strutture disponibili: ${availableRooms.length > 0 ? availableRooms.join(", ") : "Nessuna"}`);

        const isAvailable = availableRooms.some(room => room.toLowerCase().includes(apartment.toLowerCase()));

        console.log(`✅ Risultato: ${isAvailable ? "DISPONIBILE" : "NON DISPONIBILE"}`);

        res.json({ available: isAvailable });

    } catch (error) {
        console.error("❌ Errore Puppeteer:", error);
        res.status(500).json({ error: "Errore durante il controllo disponibilità" });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Esporta l'app come modulo (fondamentale per Vercel)
module.exports = app;

// Rimuovi queste righe:
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`🚀 Server in esecuzione sulla porta ${PORT}`);
// });