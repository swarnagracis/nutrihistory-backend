const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const signupRoute = require('./routes/signup');
const loginRoute = require('./routes/login');
const opPatientsRoutes = require('./routes/opPatients');
const opScreeningRoute = require('./routes/opScreening');
const ipScreeningRoutes = require('./routes/ipScreening');
const followUpRoutes = require('./routes/followUpRecords');


const app = express();
const PORT = 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(bodyParser.json());

app.use('/api/signup', signupRoute);
app.use('/api/login', loginRoute);
app.use('/api/op-patients', opPatientsRoutes);
app.use('/api/op-screening', opScreeningRoute);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/ipnutritional-screening', ipScreeningRoutes);
app.use('/api/follow-ups', followUpRoutes);



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});