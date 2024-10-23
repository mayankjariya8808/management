import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Expense = () => {
    const { memberId } = useParams();
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState([]);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        const fetchExpenses = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/members/${memberId}/expenses`);
                setExpenses(res.data);
            } catch (error) {
                console.error('Error fetching expenses:', error);
            }
        };
        fetchExpenses();
    }, [memberId]);

    const handleAddExpense = async () => {
        if (description && !isNaN(amount) && amount > 0) {
            const newExpense = { description, amount: parseFloat(amount) };
            try {
                const res = await axios.post(`http://localhost:5000/api/members/${memberId}/expenses`, newExpense);
                setExpenses([...expenses, res.data]);
                setDescription('');
                setAmount('');
            } catch (error) {
                console.error('Error adding expense:', error.response?.data || error.message);
            }
        } else {
            alert('Please enter a valid description and amount greater than zero.');
        }
    };

    const handleDeleteExpense = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/expenses/${id}`);
            const updatedExpenses = expenses.filter(expense => expense._id !== id);
            setExpenses(updatedExpenses);
        } catch (error) {
            console.error('Error deleting expense:', error.response?.data || error.message);
        }
    };

    const totalExpense = useMemo(() => {
        return expenses.reduce((sum, expense) => sum + expense.amount, 0);
    }, [expenses]);

    // New function to send the total expense to the backend
    const updateTotalExpense = async () => {
        try {
            await axios.put(`http://localhost:5000/api/members/${memberId}/total-expense`, { totalExpense });
            alert('Total expense updated successfully.');
        } catch (error) {
            console.error('Error updating total expense:', error.response?.data || error.message);
        }
    };

    return (
        <Box sx={{ padding: 4 }}>
            <Button variant="outlined" sx={{ marginBottom: 2 }} onClick={() => navigate(-1)}>
                Back
            </Button>

            <Typography variant="h4" gutterBottom>
                Expenses for Member
            </Typography>
            <Typography variant="h4" gutterBottom>
                Total Expense: ${totalExpense.toFixed(2)}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                <TextField
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <TextField
                    label="Amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
                <Button variant="contained" onClick={handleAddExpense}>
                    Add Expense
                </Button>
            </Box>

            <List>
                {expenses.map((expense) => (
                    <ListItem key={expense._id}>
                        <ListItemText primary={expense.description} secondary={`$${expense.amount}`} />
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteExpense(expense._id)}>
                            <DeleteIcon />
                        </IconButton>
                    </ListItem>
                ))}
            </List>

            <Button variant="contained" onClick={updateTotalExpense} sx={{ marginTop: 2 }}>
                Update Total Expense in Member
            </Button>
        </Box>
    );
};

export default Expense;
