document.addEventListener("DOMContentLoaded", () => {
    fetchCurrencies();
});

async function fetchCurrencies() {
    try {
        const response = await fetch('https://api.frankfurter.app/currencies');
        const currencies = await response.json();
        populateDropdowns(currencies);
    } catch (error) {
        console.error("Error fetching currencies:", error);
    }
}

function populateDropdowns(currencies) {
    const fromSelect = document.getElementById("from");
    const toSelect = document.getElementById("to");

    for (const currency in currencies) {
        const option1 = document.createElement("option");
        option1.value = currency;
        option1.textContent = `${currency} - ${currencies[currency]}`;

        const option2 = option1.cloneNode(true); // Clone for second dropdown

        fromSelect.appendChild(option1);
        toSelect.appendChild(option2);

    }

    // Set default values
    fromSelect.value = "USD";
    toSelect.value = "EUR";
    
}

async function convertCurrency() {
    const amount = document.getElementById("amount").value;
    const from = document.getElementById("from").value;
    const to = document.getElementById("to").value;

    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    if (from === to) {
        document.getElementById("result").innerText = amount;
        return;
    }

    try {
        const response = await fetch(`/api/convert?amount=${amount}&from=${from}&to=${to}`);
        const data = await response.json();
        document.getElementById("result").innerText = `${data.rates[to]} ${to}`;
    } catch (error) {
        console.error("Error converting currency:", error);
        document.getElementById("result").innerText = "Conversion failed!";
    }
}