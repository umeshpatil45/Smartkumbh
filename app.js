const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const session = require('express-session');
const { Server } = require('socket.io');
const helmet = require('helmet');
const path = require('path');

// मॉडेल्स इम्पोर्ट
const Facility = require('./models/Facility');
const Officer = require('./models/Officer'); 
const User = require('./models/User');
const Identity = require('./models/identity-QR');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(helmet({
    contentSecurityPolicy: false,
}));

// २. एक्सप्रेस सेटिंग्स
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'kumbh_secret_key',
    resave: false,
    saveUninitialized: true
}));

// ३. डेटाबेस कनेक्शन
mongoose.connect('mongodb://127.0.0.1:27017/kumbhDB')
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// ४. मिडलवेअर्स (Middleware)
function isAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.redirect('/admin-login');
}

function isLoggedIn(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/officers-login'); // इथे चूक होती, ती सुधारली आहे
}

// ५. रूट्स (Routes)

// होम पेज
app.get('/', async (req, res) => {
    const stats = await Facility.find();
    res.render('index'); // इथे '.ejs' लिहायची गरज नाही

});

// ऑफिसर लॉगिन (GET & POST)
app.get('/officers-login', (req, res) => {
    res.render('officers-login'); 
});



app.get('/robo', (req, res) => {
    res.render('robo'); // robo.ejs फाईल लोड होईल
});

// GET: Render Login Page [cite: 65, 77]
app.get('/user-login', (req, res) => {
    res.render('user-login');
});


// GET: Render Register Page [cite: 47, 48]
app.get('/user-register', (req, res) => {
    res.render('user-register');
});

app.post('/register', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const newUser = new User({ name, phone, password });
        await newUser.save();
        res.send("<script>alert('Success'); window.location='/user-login';</script>");
    } catch (err) {
        console.error("रजिस्ट्रेशन एरर:", err); // यामुळे टर्मिनलमध्ये खरी समस्या दिसेल
        res.status(500).send("Server Error: " + err.message);
    }
});

// POST: Login Logic
app.post('/login', async (req, res) => {
    const { username, password } = req.body; // 'username' मध्ये फोन किंवा ईमेल असेल
    try {
        const user = await User.findOne({ 
            $or: [{ phone: username }, { email: username }], 
            password: password 
        });

        if (user) {
            req.session.userId = user._id;
            req.session.isLoggedIn = true;
            req.session.userName = user.name;
            
            // लॉगिन यशस्वी झाल्यावर युजरला डॅशबोर्डवर पाठवा
            res.redirect('/user-dashboard'); 
        } else {
            res.send("<script>alert('Invalid Credentials'); window.location='/login';</script>");
        }
    } catch (err) {
        res.status(500).send("Error logging in");
    }
});
app.get('/hotels', isLoggedIn, (req, res) => {
    res.render('hotels', { user: req.session.userName });
});

app.get('/user-dashboard', async (req, res) => {
    try {
        // १. सेशनमध्ये युजरची ID आहे का ते तपासा
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        // २. डेटाबेस मधून युजरची संपूर्ण माहिती काढा
        const userData = await User.findById(req.session.userId);

        if (!userData) {
            return res.redirect('/login');
        }

        // ३. 'user' या नावाने डेटा EJS कडे पाठवा
        res.render('user-dashboard', { 
            user: userData, 
            crowdStatus: "Medium", 
            weather: "24°C", 
            aartiTime: "6:30 PM" 
        });

    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
});
// १. फक्त हा एकच रूट ठेवा (दुसरा खालचा डिलीट करा)
app.get('/wheels', isLoggedIn, async (req, res) => {
    try {
        // सेशन मधून युजर शोधणे
        const userData = await User.findById(req.session.userId);

        if (!userData) {
            return res.redirect('/user-login');
        }

        // 'user' डेटा सोबत रेंडर करणे
        res.render('wheels', { 
            user: userData 
        });

    } catch (err) {
        console.error("Wheels Route Error:", err);
        res.status(500).send("Error loading wheels page");
    }
});
// API Endpoint
app.post('/api/Bookings', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();
        res.status(200).send({ message: "Saved Successfully" });
    } catch (err) {
        res.status(500).send(err);
    }
});

// 3. Live Map Route (Jar tumhi vegli file banavli asel tar)
app.get('/map', (req, res) => {
    res.render('map');
});

// 4. API Route - Rides chi list backend kadun pathvnyasathi (Optional pan Best Practice)
app.get('/api/rides', (req, res) => {
    const rides = [
        { name: 'Quick Auto', rate: 12, category: 'auto' },
        { name: 'Prime Sedan', rate: 18, category: 'car' },
        { name: 'Moto Zip', rate: 7, category: 'bike' }
        // ... baki 20+ rides ithe add karu shakto
    ];
    res.json(rides);
});
app.get('/ai-assistant', (req, res) => {
    res.render('ai-robot');
});


app.get('/user-crowd', (req, res) => {
    res.render('user-crowd'); // No extension needed, EJS is default
});

app.get('/aarti-schedule', (req, res) => {
    res.render('aarti-schedule'); // Check kara file naav match hotay ka
});

app.get('/weather-alert', (req, res) => {
    res.render('weather-alert');
});
app.get('/profile', (req, res) => {
    res.render('profile');
});
// app.js madhe asa badal kara
app.get('/identity-QR', (req, res) => {
    // समजा आपण सध्या हार्डकोडेड डेटा पाठवूया
    const userData = {
        qrId: "NV-8892-UX"
    };
    
    res.render('identity-QR', { user: userData }); 
});
// Route: Identity Sync karne
app.post('/api/sync-identity', async (req, res) => {
    try {
        const { qrId, faceDescriptor, personCount } = req.body;

        // Database logic: Jar user asel tar update kara, nasel tar navin banva
        const user = await UserIdentity.findOneAndUpdate(
            { qrId: qrId },
            { 
                faceDescriptor: faceDescriptor, // Security logic: Ha descriptor unique asto
                lastDetectedPersons: personCount,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ message: "Data Synced to MongoDB!", success: true });
    } catch (error) {
        res.status(500).json({ message: "Sync Failed", error: error.message });
    }
});


app.post('/api/save-identity', async (req, res) => {
    try {
        const { leader, reason, count, qrId } = req.body;

        // Ata ha 'new' keyword barobar kaam karel
        const newEntry = new Identity({
            leaderName: leader,
            visitReason: reason,
            personCount: count,
            qrId: qrId
        });

        await newEntry.save();
        res.status(200).json({ success: true, message: "Saved!" });
    } catch (err) {
        console.error("Backend Error:", err);
        res.status(500).json({ success: false });
    }
});



// --- REGISTRATION ROUTES ---
app.get('/register', (req, res) => {
    res.render('register'); // Register page render kara
});

app.post('/register-officer', async (req, res) => {
    try {
        const { name, accessId, password, department } = req.body;
        
        const existing = await Officer.findOne({ accessId });
        if (existing) {
            return res.render('officer-register', { error: "Access ID already registered!" });
        }

        const newOfficer = new Officer({
            name, accessId, password, department, status: 'Pending'
        });

        await newOfficer.save();
        // Register kelyavar direct login page var pathva
        res.render('officers-login', { error: "Registration successful! Please wait for Admin Approval." });
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// --- LOGIN ROUTES ---
app.get('/officers-login', (req, res) => {
    res.render('officers-login'); // Login page render kara
});

app.post('/officers-login', async (req, res) => {
    try {
        const { accessId, password } = req.body;
        const officer = await Officer.findOne({ accessId });

        if (!officer || officer.password !== password) {
            return res.render('officers-login', { error: "Invalid Access ID or Security PIN!" });
        }

        if (officer.status === 'Pending') {
            return res.render('officers-login', { 
                error: "Access Denied: Your account is still 'Pending' approval from Admin." 
            });
        }

        // ✅ हा बदल करा: सेशनमध्ये ऑफिसरची ID सेव्ह करा
        req.session.userId = officer._id; 
        req.session.isLoggedIn = true;

        console.log(`Officer ${accessId} authorized. Redirecting to dashboard...`);
        res.redirect('/officer-dashboard');

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});



app.get('/officer-dashboard', isLoggedIn, async (req, res) => {
    try {
        // लॉगिन केलेल्या ऑफिसरचा डेटा मिळवा
        const officer = await Officer.findById(req.session.userId);
        
        if (!officer) return res.redirect('/login');

        // डॅशबोर्ड रेंडर करताना 'assignedZone' पाठवा
        res.render('officer-dashboard', { 
            user: officer,
            assignedZone: officer.zone || "General" 
        });
    } catch (err) {
        res.redirect('/login');
    }
});

app.post('/api/register-person', async (req, res) => {
    try {
        const { name, description, image, zone } = req.body;

        // नवीन डेटा तयार करणे
        const newPerson = new MissingPerson({
            name,
            description,
            image, // हा तोच imageData (Base64) आहे
            zone
        });

        // MongoDB मध्ये सेव्ह करणे
        await newPerson.save();

        console.log(`✅ New Registration: ${name} in ${zone}`);
        
        res.status(200).json({ 
            success: true, 
            message: "Person registered successfully in KumbhVerse AI database" 
        });

    } catch (error) {
        console.error("❌ Error saving person:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// 2. Crowd Control Page
app.get('/officer-crowd', isLoggedIn, async (req, res) => {
    const officer = await Officer.findById(req.session.userId);
    res.render('officer-crowd', { 
        user: officer, 
        assignedZone: officer.zone || "Ram Kund" 
    });
});



// १. Missing Portal साठी
app.get('/officers-missing', isLoggedIn, async (req, res) => {
    try {
        const officer = await Officer.findById(req.session.userId);
        res.render('officers-missing', { 
            user: officer, 
            assignedZone: officer.zone || "General" 
        });
    } catch (err) {
        res.status(500).send("Error loading page");
    }
});

// 3. Route & Traffic Control Route
app.get('/officer-route', isLoggedIn, (req, res) => {
    const user = { firstName: "Rajesh" };
    res.render('officer-route', { user: user, assignedZone: "Ram Kund" });
});

// 5. Seva Monitoring
app.get('/officer-seva', isLoggedIn, async (req, res) => {
    const officer = await Officer.findById(req.session.userId);
    res.render('officers-seva', { 
        user: officer, 
        assignedZone: officer.zone || "Ram Kund" 
    });
});

// 6. Medical Camp Status
app.get('/officer-medical-camp', isLoggedIn, async (req, res) => {
    const officer = await Officer.findById(req.session.userId);
    res.render('officers-medical-camp', { 
        user: officer, 
        assignedZone: officer.zone || "Ram Kund" 
    });
});

// 7. Resource Map
app.get('/officer-resource', isLoggedIn, async (req, res) => {
    const officer = await Officer.findById(req.session.userId);
    res.render('officers-resource', { 
        user: officer, 
        assignedZone: officer.zone || "Ram Kund" 
    });
});


// रजिस्ट्रेशन
app.get('/register', (req, res) => { res.render('register'); });

app.post('/register', async (req, res) => {
    try {
        const newOfficer = new Officer({...req.body, status: 'Pending'});
        await newOfficer.save();
        res.status(200).json({ message: "Success" }); 
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

// ॲडमिन लॉगिन
app.get('/admin-login', (req, res) => { res.render('admin-login'); });

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    if (username === "admin_kumbh" && password === "nashik2027") {
        req.session.isAdmin = true;
        res.redirect('/admin-dashboard'); 
    } else {
        res.render('admin-login', { error: "Invalid Credentials!" });
    }
});

// जर तुम्ही ब्राउझरमध्ये localhost:3000/admin/dashboard असे टाईप करणार असाल:
app.get('/admin-dashboard', async (req, res) => { 
    // इकडे /admin-dashboard ऐवजी /admin/dashboard असू शकते
    const users = await User.find({});
    const officers = await Officer.find({});
    res.render('admin-dashboard', { users, officers });
});

// ऑफिसरला अप्रूव्ह करण्यासाठीचा रूट
app.post('/admin-approve-officer/:id', async (req, res) => {
    try {
        const officerId = req.params.id;
        // डेटाबेसमध्ये स्टेटस अपडेट करा (उदा. MongoDB/Mongoose वापरत असाल तर)
        await Officer.findByIdAndUpdate(officerId, { status: 'Approved' });
        
        // डॅशबोर्डला रिअल-टाइम अपडेट पाठवण्यासाठी socket.io
        io.emit('update_dashboard'); 

        res.redirect('/admin-dashboard'); // परत डॅशबोर्डवर पाठवा
    } catch (err) {
        console.error(err);
        res.status(500).send("Error approving officer");
    }
});

// २. GET API - ऑफिसर्स पेज दाखवण्यासाठी
app.get('/admin-officers', async (req, res) => {
    try {
        // डेटाबेसमधून सर्व ऑफिसर्स मिळवा
        const allOfficers = await Officer.find({});
        
        // admin-officers.ejs फाईल रेंडर करा आणि डेटा पाठवा
        res.render('admin-officers', { 
            officers: allOfficers 
        });
    } catch (err) {
        console.error("Error fetching officers:", err);
        res.status(500).send("Internal Server Error");
    }
});
app.get('/admin-settings', isAdmin, (req, res) => {
    res.render('admin-settings'); // हे पेज आता दिसायला लागेल [cite: 107]
});


app.get('/admin-alerts', isAdmin, (req, res) => res.render('admin-alerts'));
// Route for Crowd Analytics Page
app.get('/admin-crowd', (req, res) => {
    try {
        // You can pass real data here from your database later
        res.render('admin-crowd-map', {
            totalCrowd: "1.2 Lakh",
            lastUpdated: new Date().toLocaleTimeString()
        });
    } catch (error) {
        console.error("Error rendering crowd map:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ६. सर््हर सुरू करा
const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));