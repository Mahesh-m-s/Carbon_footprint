/* ============================================
  Carbon Footprint EMS — Frontend JS
   ============================================ */

const API = 'http://localhost:3000/api';

// ─── Utility ─────────────────────────────────────────────────────────────

async function apiFetch(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: 'Cannot connect to server. Is the backend running?' };
  }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `form-msg ${type}`;
  setTimeout(() => { el.className = 'form-msg'; el.textContent = ''; }, 4000);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtNum(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return parseFloat(n).toFixed(decimals);
}

// ─── Navigation ───────────────────────────────────────────────────────────

const pageTitles = {
  dashboard: 'Dashboard',
  devices: 'Device Usage',
  internet: 'Internet Usage',
  electricity: 'Electricity',
  reports: 'Reports'
};

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = pageTitles[page];
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  // Load page data
  if (page === 'dashboard') loadDashboard();
  if (page === 'devices')   { loadDeviceDropdowns(); loadDeviceUsage(); }
  if (page === 'internet')  { loadDeptDropdowns('inetDeptSelect'); loadInternet(); }
  if (page === 'electricity') { loadDeptDropdowns('elecDeptSelect'); loadElectricity(); }
  if (page === 'reports')   loadReports();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

document.getElementById('menuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// Set today's date in topbar
document.getElementById('currentDate').textContent =
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Set default dates on form inputs
document.querySelectorAll('input[type="date"]').forEach(el => {
  if (!el.id.includes('Filter')) {
    el.value = new Date().toISOString().split('T')[0];
  }
});

// ─── Dropdowns ────────────────────────────────────────────────────────────

async function loadDeviceDropdowns() {
  const data = await apiFetch(`${API}/devices`);
  const sel = document.getElementById('deviceSelect');
  sel.innerHTML = '<option value="">Select device...</option>';
  if (data.success) {
    data.data.forEach(d => {
      sel.innerHTML += `<option value="${d.id}">${d.device_name} (${d.device_type}) — ${d.department_name || 'No dept'}</option>`;
    });
  }
}

async function loadDeptDropdowns(selectId) {
  const data = await apiFetch(`${API}/departments`);
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">Select department...</option>';
  if (data.success) {
    data.data.forEach(d => {
      sel.innerHTML += `<option value="${d.id}">${d.name}</option>`;
    });
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────

let trendChartInst = null;
let deptChartInst  = null;

async function loadDashboard() {
  const data = await apiFetch(`${API}/dashboard/summary`);
  if (!data.success) return;

  const s = data.summary;
  document.getElementById('statTotal').textContent = fmtNum(s.total_kg);
  document.getElementById('statElec').textContent  = fmtNum(s.electricity.total_emission_kg) + ' kg';
  document.getElementById('statInet').textContent  = fmtNum(s.internet.total_emission_kg) + ' kg';
  document.getElementById('statDev').textContent   = fmtNum(s.devices.total_emission_kg) + ' kg';

  // Trend Chart
  const trendCtx = document.getElementById('trendChart').getContext('2d');
  if (trendChartInst) trendChartInst.destroy();
  trendChartInst = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: data.trend.map(r => fmtDate(r.date)),
      datasets: [{
        label: 'Electricity CO₂ (kg)',
        data: data.trend.map(r => r.elec_emission),
        borderColor: '#3fb950',
        backgroundColor: 'rgba(63, 185, 80, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3fb950',
        pointRadius: 4,
      }]
    },
    options: chartDefaults()
  });

  // Dept Chart
  const deptCtx = document.getElementById('deptChart').getContext('2d');
  if (deptChartInst) deptChartInst.destroy();
  const deptColors = ['#3fb950','#58d9cf','#e3b341','#79c0ff','#f85149','#b48ead'];
  deptChartInst = new Chart(deptCtx, {
    type: 'doughnut',
    data: {
      labels: data.byDept.map(r => r.department),
      datasets: [{
        data: data.byDept.map(r => r.emission_kg),
        backgroundColor: deptColors,
        borderColor: '#161b22',
        borderWidth: 3
      }]
    },
    options: {
      ...chartDefaults(),
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8b949e', font: { size: 11 }, padding: 10 }
        }
      }
    }
  });
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: { color: '#8b949e', font: { family: 'DM Mono', size: 11 } }
      }
    },
    scales: {
      x: {
        ticks: { color: '#8b949e', font: { size: 10 } },
        grid: { color: '#2a3441' }
      },
      y: {
        ticks: { color: '#8b949e', font: { size: 10 } },
        grid: { color: '#2a3441' }
      }
    }
  };
}

// ─── Device Usage ─────────────────────────────────────────────────────────

async function loadDeviceUsage() {
  const from = document.getElementById('deviceFilterFrom').value;
  const to   = document.getElementById('deviceFilterTo').value;
  let url = `${API}/device-usage?limit=100`;
  if (from) url += `&from=${from}`;
  if (to)   url += `&to=${to}`;

  const data = await apiFetch(url);
  const tbody = document.getElementById('deviceTable');

  if (!data.success) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">⚠ ${data.error}</td></tr>`;
    return;
  }
  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.data.map(r => `
    <tr>
      <td>${fmtDate(r.usage_date)}</td>
      <td>${r.device_name}</td>
      <td><span class="type-badge">${r.device_type}</span></td>
      <td>${r.department || '—'}</td>
      <td>${r.hours_used}h</td>
      <td class="emission-val">${fmtNum(r.emission_kg)} kg</td>
      <td>${r.recorded_by || '—'}</td>
      <td><button class="btn-del" onclick="deleteRecord('device-usage', ${r.id}, loadDeviceUsage)">✕</button></td>
    </tr>
  `).join('');
}

async function submitDeviceUsage() {
  const body = {
    device_id:   document.getElementById('deviceSelect').value,
    usage_date:  document.getElementById('deviceDate').value,
    hours_used:  document.getElementById('deviceHours').value,
    recorded_by: document.getElementById('deviceRecorder').value,
    notes:       document.getElementById('deviceNotes').value
  };
  if (!body.device_id || !body.usage_date || !body.hours_used)
    return showMsg('deviceMsg', 'Please fill all required fields.', 'error');

  const data = await apiFetch(`${API}/device-usage`, { method: 'POST', body: JSON.stringify(body) });
  if (data.success) {
    showMsg('deviceMsg', '✓ Device usage logged successfully!', 'success');
    showToast('Device usage recorded', 'success');
    loadDeviceUsage();
    loadDashboard();
  } else {
    showMsg('deviceMsg', '✕ ' + data.error, 'error');
  }
}

// ─── Internet ─────────────────────────────────────────────────────────────

async function loadInternet() {
  const from = document.getElementById('inetFilterFrom').value;
  const to   = document.getElementById('inetFilterTo').value;
  let url = `${API}/internet?limit=100`;
  if (from) url += `&from=${from}`;
  if (to)   url += `&to=${to}`;

  const data = await apiFetch(url);
  const tbody = document.getElementById('inetTable');

  if (!data.success) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">⚠ ${data.error}</td></tr>`;
    return;
  }
  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.data.map(r => `
    <tr>
      <td>${fmtDate(r.consumption_date)}</td>
      <td>${r.department}</td>
      <td>${fmtNum(r.data_used_gb, 3)} GB</td>
      <td>${r.num_users}</td>
      <td>${r.connection_type}</td>
      <td class="emission-val">${fmtNum(r.emission_kg)} kg</td>
      <td>${r.recorded_by || '—'}</td>
      <td><button class="btn-del" onclick="deleteRecord('internet', ${r.id}, loadInternet)">✕</button></td>
    </tr>
  `).join('');
}

async function submitInternet() {
  const body = {
    department_id:    document.getElementById('inetDeptSelect').value,
    consumption_date: document.getElementById('inetDate').value,
    data_used_gb:     document.getElementById('inetData').value,
    num_users:        document.getElementById('inetUsers').value,
    connection_type:  document.getElementById('inetType').value,
    recorded_by:      document.getElementById('inetRecorder').value
  };
  if (!body.department_id || !body.consumption_date || !body.data_used_gb)
    return showMsg('inetMsg', 'Please fill all required fields.', 'error');

  const data = await apiFetch(`${API}/internet`, { method: 'POST', body: JSON.stringify(body) });
  if (data.success) {
    showMsg('inetMsg', '✓ Internet usage logged!', 'success');
    showToast('Internet usage recorded', 'success');
    loadInternet();
  } else {
    showMsg('inetMsg', '✕ ' + data.error, 'error');
  }
}

// ─── Electricity ──────────────────────────────────────────────────────────

async function loadElectricity() {
  const from = document.getElementById('elecFilterFrom').value;
  const to   = document.getElementById('elecFilterTo').value;
  let url = `${API}/electricity?limit=100`;
  if (from) url += `&from=${from}`;
  if (to)   url += `&to=${to}`;

  const data = await apiFetch(url);
  const tbody = document.getElementById('elecTable');

  if (!data.success) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">⚠ ${data.error}</td></tr>`;
    return;
  }
  if (!data.data.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.data.map(r => `
    <tr>
      <td>${fmtDate(r.usage_date)}</td>
      <td>${r.department}</td>
      <td>${fmtNum(r.units_consumed_kwh, 2)}</td>
      <td>${r.meter_reading_start ?? '—'}</td>
      <td>${r.meter_reading_end ?? '—'}</td>
      <td class="emission-val">${fmtNum(r.emission_kg)} kg</td>
      <td>${r.recorded_by || '—'}</td>
      <td><button class="btn-del" onclick="deleteRecord('electricity', ${r.id}, loadElectricity)">✕</button></td>
    </tr>
  `).join('');
}

async function submitElectricity() {
  const body = {
    department_id:      document.getElementById('elecDeptSelect').value,
    usage_date:         document.getElementById('elecDate').value,
    units_consumed_kwh: document.getElementById('elecUnits').value,
    meter_reading_start: document.getElementById('elecStart').value || null,
    meter_reading_end:   document.getElementById('elecEnd').value || null,
    recorded_by:        document.getElementById('elecRecorder').value,
    notes:              document.getElementById('elecNotes').value
  };
  if (!body.department_id || !body.usage_date || !body.units_consumed_kwh)
    return showMsg('elecMsg', 'Please fill all required fields.', 'error');

  const data = await apiFetch(`${API}/electricity`, { method: 'POST', body: JSON.stringify(body) });
  if (data.success) {
    showMsg('elecMsg', '✓ Electricity usage logged!', 'success');
    showToast('Electricity usage recorded', 'success');
    loadElectricity();
  } else {
    showMsg('elecMsg', '✕ ' + data.error, 'error');
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────

async function deleteRecord(resource, id, reloadFn) {
  if (!confirm('Delete this record?')) return;
  const data = await apiFetch(`${API}/${resource}/${id}`, { method: 'DELETE' });
  if (data.success) {
    showToast('Record deleted', 'success');
    reloadFn();
  } else {
    showToast('Delete failed: ' + data.error, 'error');
  }
}

// ─── Reports ──────────────────────────────────────────────────────────────

let monthlyChartInst = null;

async function loadReports() {
  const summary = await apiFetch(`${API}/dashboard/summary`);
  const monthly = await apiFetch(`${API}/dashboard/monthly`);

  if (summary.success) {
    const s = summary.summary;
    document.getElementById('repElecKg').textContent  = fmtNum(s.electricity.total_emission_kg);
    document.getElementById('repElecKwh').textContent = fmtNum(s.electricity.total_kwh);
    document.getElementById('repInetKg').textContent  = fmtNum(s.internet.total_emission_kg);
    document.getElementById('repInetGb').textContent  = fmtNum(s.internet.total_gb);
    document.getElementById('repDevKg').textContent   = fmtNum(s.devices.total_emission_kg);
    document.getElementById('repDevHrs').textContent  = fmtNum(s.devices.total_hours, 0);
    document.getElementById('repTotal').textContent   = fmtNum(s.total_kg);
    // 1 tree absorbs ~21 kg CO2/year
    const trees = Math.ceil(parseFloat(s.total_kg) / (21 / 12));
    document.getElementById('repTrees').textContent   = trees + '/month';

    // Department table
    const totalKg = parseFloat(s.total_kg) || 1;
    const tbody = document.getElementById('deptReportTable');
    if (!summary.byDept || !summary.byDept.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">No department data available.</td></tr>';
    } else {
      tbody.innerHTML = summary.byDept.map(r => {
        const pct = ((r.emission_kg / totalKg) * 100).toFixed(1);
        const sev = r.emission_kg > 100 ? 'high' : r.emission_kg > 40 ? 'med' : 'low';
        const sevLabel = sev === 'high' ? 'High' : sev === 'med' ? 'Moderate' : 'Low';
        return `<tr>
          <td>${r.department}</td>
          <td class="emission-val">${fmtNum(r.emission_kg)} kg</td>
          <td><span style="font-family:DM Mono;color:var(--text2)">${pct}%</span></td>
          <td><span class="severity-badge severity-${sev}">${sevLabel}</span></td>
        </tr>`;
      }).join('');
    }
  }

  if (monthly.success) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChartInst) monthlyChartInst.destroy();
    monthlyChartInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthly.data.map(r => r.month),
        datasets: [{
          label: 'Monthly Electricity CO₂ (kg)',
          data: monthly.data.map(r => r.emission_kg),
          backgroundColor: 'rgba(63, 185, 80, 0.7)',
          borderColor: '#3fb950',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: chartDefaults()
    });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────
navigateTo('dashboard');
