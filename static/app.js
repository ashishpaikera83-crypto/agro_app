const form = document.getElementById('prediction-form');
const resultBox = document.getElementById('result-box');
const chartContainer = document.getElementById('chart-container');
const chartPlaceholder = document.getElementById('chart-placeholder');

let predictionChart = null;
let predictionHistory = [];

// Get API base URL
const API_BASE_URL = window.location.origin;

if (form && resultBox) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Show loading state
    resultBox.innerHTML = `
      <div class="placeholder-card">
        <h3>Running prediction…</h3>
        <p class="muted">Please wait while the model calculates the result.</p>
      </div>
    `;

    // Build payload
    const payload = {
      Area: document.getElementById('Area')?.value || '',
      Item: 'Asses',
      Element: 'Stocks',
      Year: Number(document.getElementById('Year')?.value || 2020),
      Unit: 'Head'
    };

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        resultBox.innerHTML = `
          <div class="placeholder-card">
            <h3>Prediction failed</h3>
            <p class="error">${data.error || 'Something went wrong while predicting.'}</p>
          </div>
        `;
        return;
      }

      // Store prediction history
      predictionHistory.push({
        area: payload.Area,
        item: payload.Item,
        year: payload.Year,
        prediction: parseFloat(data.prediction),
        probability: data.probability
      });

      // Format prediction value
      const predictionValue = parseFloat(data.prediction);
      const formattedPrediction = predictionValue.toLocaleString('en-US', {
        maximumFractionDigits: 0
      });

      // Handle actual value if available
      const actualValue = data.actual !== undefined ? parseFloat(data.actual) : null;
      let actualHtml = '';

      if (actualValue !== null && !Number.isNaN(actualValue)) {
        const formattedActual = actualValue.toLocaleString('en-US', {
          maximumFractionDigits: 0
        });
        const diffValue = parseFloat(data.diff || 0);
        const formattedDiff = diffValue.toLocaleString('en-US', {
          maximumFractionDigits: 0
        });
        const diffColor = diffValue >= 0 ? '#16a34a' : '#dc2626';

        actualHtml = `
          <div class="result-summary result-actual">
            <div class="result-stat">
              <span class="label">Actual value</span>
              <strong>${formattedActual}</strong>
            </div>
            <div class="result-stat" style="color: ${diffColor};">
              <span class="label">Difference</span>
              <strong>${formattedDiff}</strong>
            </div>
          </div>
        `;
      }

      // Display results
      resultBox.innerHTML = `
        <div class="result-summary">
          <div class="result-stat">
            <span class="label">Prediction</span>
            <strong>${formattedPrediction}</strong>
          </div>
          ${data.probability !== null && data.probability !== undefined ? `
            <div class="result-stat">
              <span class="label">Confidence</span>
              <strong>${(data.probability * 100).toFixed(2)}%</strong>
            </div>
          ` : ''}
        </div>
        ${actualHtml}
      `;

      // Update chart
      updateChart();

    } catch (error) {
      console.error('Prediction error:', error);
      resultBox.innerHTML = `
        <div class="placeholder-card">
          <h3>Prediction failed</h3>
          <p class="error">Unable to reach the prediction service. ${error.message}</p>
        </div>
      `;
    }
  });
}

/**
 * Update the chart visualization with prediction history
 */
function updateChart() {
  if (!chartPlaceholder || !chartContainer) {
    return;
  }

  // Show chart, hide placeholder
  chartPlaceholder.style.display = 'none';
  chartContainer.style.display = 'block';

  const ctx = document.getElementById('prediction-chart');
  if (!ctx) return;

  const context = ctx.getContext('2d');

  // Group predictions by item
  const itemData = {};
  predictionHistory.forEach((pred) => {
    if (!itemData[pred.item]) {
      itemData[pred.item] = [];
    }
    itemData[pred.item].push(pred);
  });

  // Create datasets
  const datasets = [];
  const colors = [
    '#4f46e5',
    '#7c3aed',
    '#dc2626',
    '#f59e0b',
    '#16a34a',
    '#0891b2'
  ];
  let colorIndex = 0;

  // Get unique years sorted
  const years = [...new Set(predictionHistory.map((p) => p.year))].sort(
    (a, b) => a - b
  );

  // Create a dataset for each item
  Object.keys(itemData).forEach((item) => {
    const itemPredictions = itemData[item];
    const data = years.map((year) => {
      const pred = itemPredictions.find((p) => p.year === year);
      return pred ? pred.prediction : null;
    });

    datasets.push({
      label: item,
      data,
      borderColor: colors[colorIndex % colors.length],
      backgroundColor: colors[colorIndex % colors.length] + '20',
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      pointRadius: 5,
      pointBackgroundColor: colors[colorIndex % colors.length],
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    });

    colorIndex += 1;
  });

  // Destroy existing chart if present
  if (predictionChart) {
    predictionChart.destroy();
  }

  // Create new chart
  predictionChart = new Chart(context, {
    type: 'line',
    data: {
      labels: years,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { size: 12, weight: '600' },
            color: '#14213d',
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(20, 33, 61, 0.9)',
          titleFont: { size: 14, weight: '600' },
          bodyFont: { size: 12 },
          padding: 12,
          displayColors: true,
          callbacks: {
            label(context) {
              const value = context.parsed.y;
              return `${context.dataset.label}: ${value.toLocaleString('en-US', {
                maximumFractionDigits: 0
              })}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback(value) {
              return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
            },
            color: '#667085',
            font: { size: 11 }
          },
          grid: {
            color: '#e5e7eb',
            drawBorder: false
          }
        },
        x: {
          ticks: {
            color: '#667085',
            font: { size: 11 }
          },
          grid: {
            display: false,
            drawBorder: false
          }
        }
      }
    }
  });
}