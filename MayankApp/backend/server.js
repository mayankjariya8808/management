const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const methodOverride = require("method-override");

// Initialize the Express App
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(methodOverride("_method"));

require("dotenv").config();

const port = process.env.PORT || 3000; // Use the PORT from environment variables
const mongoUrl = process.env.MONGO_URL || 'your-atlas-connection-url'; // MongoDB Atlas connection URL


const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Set to Google or Cloudflare DNS


/// MongoDB Connection
mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const db = mongoose.connection;
  
  db.on("connected", (err) => {
    if (err) {
      console.log("DB not connected");
    } else {
      console.log("DB connected");
    }
  });

// Define Workspace Schema and Model
const WorkspaceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    totalExpenses: { type: Number, default: 0 }, // Add this line
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }]  // Reference to members
});


const Workspace = mongoose.model('Workspace', WorkspaceSchema);

const MemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contactNumber: { type: String, required: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },  // Reference to the workspace
    totalExpenses: { type: Number, default: 0 }, // Add totalExpenses to Member schema
});

const Member = mongoose.model('Member', MemberSchema);

// Route to update the total expense for a member
app.put('/api/members/:memberId/total-expense', async (req, res) => {
    const { memberId } = req.params;
    const { totalExpense } = req.body;

    try {
        const updatedMember = await Member.findByIdAndUpdate(memberId, { totalExpenses: totalExpense }, { new: true });
        if (!updatedMember) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.status(200).json(updatedMember);
    } catch (error) {
        res.status(500).json({ error: 'Error updating total expense' });
    }
});

// Define Expense Schema and Model
const ExpenseSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
});

const Expense = mongoose.model('Expense', ExpenseSchema);

// Routes
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Add Workspace (POST Request)
app.post('/api/workspaces', async (req, res) => {
    const { name, amount } = req.body;
    try {
        const newWorkspace = new Workspace({ name, amount });
        await newWorkspace.save();
        res.status(201).json(newWorkspace);
    } catch (error) {
        res.status(500).json({ error: 'Error adding workspace' });
    }
});

// Get All Workspaces (GET Request)
app.get('/api/workspaces', async (req, res) => {
    try {
        const workspaces = await Workspace.find().populate('members'); // Populate members
        res.json(workspaces);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching workspaces' });
    }
});

// Add Member to Workspace (POST Request)
app.post('/api/members', async (req, res) => {
    const { name, contactNumber, workspaceId } = req.body;

    try {
        const newMember = new Member({ name, contactNumber, workspaceId });
        const savedMember = await newMember.save();
        
        // Update the workspace with the new member's ID
        await Workspace.findByIdAndUpdate(workspaceId, { $push: { members: savedMember._id } });
        
        res.status(201).json(savedMember);
    } catch (error) {
        res.status(500).json({ error: 'Error adding member' });
    }
});

// Get Members for a Workspace (GET Request)
app.get('/api/workspaces/:id/members', async (req, res) => {
    try {
        const members = await Member.find({ workspaceId: req.params.id });
        res.json(members);
    } catch (error) {
        console.error('Error fetching members:', error); // Log error on the server
        res.status(500).json({ error: 'Error fetching members' });
    }
});

// Delete Member from Workspace (DELETE Request)
app.delete('/api/workspaces/:workspaceId/members/:memberId', async (req, res) => {
    const { workspaceId, memberId } = req.params;

    try {
        // Remove member from the database
        await Member.findByIdAndDelete(memberId);

        // Remove member reference from the workspace
        await Workspace.findByIdAndUpdate(workspaceId, { $pull: { members: memberId } });

        res.status(200).json({ message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting member' });
    }
});

// Add Expense for a Member (POST Request)
app.post('/api/members/:memberId/expenses', async (req, res) => {
    const { description, amount } = req.body;
    const { memberId } = req.params;

    try {
        const newExpense = new Expense({ description, amount, memberId });
        await newExpense.save();
        
        // Update the workspace's total expenses
        const member = await Member.findById(memberId).populate('workspaceId');
        if (member && member.workspaceId) {
            await Workspace.findByIdAndUpdate(member.workspaceId._id, { $inc: { totalExpenses: amount } });
        }

        res.status(201).json(newExpense);
    } catch (error) {
        res.status(500).json({ error: 'Error adding expense' });
    }
});

// Get Expenses for a Member (GET Request)
app.get('/api/members/:memberId/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find({ memberId: req.params.memberId });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching expenses' });
    }
});

// Delete Expense (DELETE Request)
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Update the workspace's total expenses
        const member = await Member.findById(expense.memberId).populate('workspaceId');
        if (member && member.workspaceId) {
            await Workspace.findByIdAndUpdate(member.workspaceId._id, { $inc: { totalExpenses: -expense.amount } });
        }

        await Expense.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting expense' });
    }
});





// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
