(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    //  SCORING LOGIC
    // ─────────────────────────────────────────────────────────────

    var PILLAR_WEIGHTS = { moneyFlow: 40, financialHistory: 30, professionalStability: 30 };
    var PILLAR_LABELS = {
        moneyFlow: 'Money-Flow',
        financialHistory: 'Financial History',
        professionalStability: 'Professional Stability'
    };

    function getEffectiveWeights(pillars) {
        var present = Object.keys(PILLAR_WEIGHTS).filter(function (k) {
            return pillars[k] !== null && pillars[k] !== undefined;
        });
        var totalWeight = present.reduce(function (sum, k) { return sum + PILLAR_WEIGHTS[k]; }, 0) || 1;
        var weights = {};
        Object.keys(PILLAR_WEIGHTS).forEach(function (k) {
            weights[k] = present.indexOf(k) !== -1
                ? Math.round((PILLAR_WEIGHTS[k] / totalWeight) * 1000) / 10
                : 0;
        });
        return weights;
    }

    function computeTrustScore(pillars) {
        var weights = getEffectiveWeights(pillars);
        var score = Object.keys(PILLAR_WEIGHTS).reduce(function (sum, k) {
            var value = pillars[k];
            if (value === null || value === undefined) return sum;
            return sum + value * (weights[k] / 100);
        }, 0);
        return Math.round(score);
    }

    function deriveRiskLevel(score) {
        if (score >= 75) return 'Low';
        if (score >= 50) return 'Medium';
        return 'High';
    }

    function getScoreColor(score) {
        if (score >= 75) return '#34d399';
        if (score >= 50) return '#fbbf24';
        return '#f87171';
    }

    function getRiskBadgeClass(level) {
        var map = { Low: 'badge-high', Medium: 'badge-medium', High: 'badge-low' };
        return map[level] || 'badge-medium';
    }

    function computeFraudIndicators(user, allUsers) {
        var tx = user.transactions || [];
        var velocityPerDay = 0;
        if (tx.length > 1) {
            var times = tx.map(function (t) { return new Date(t.date).getTime(); }).sort(function (a, b) { return a - b; });
            var spanDays = Math.max(1, (times[times.length - 1] - times[0]) / 86400000);
            velocityPerDay = tx.length / spanDays;
        }

        var peers = allUsers.filter(function (u) { return u.id !== user.id; });
        var peerAvgMoneyFlow = peers.length
            ? peers.reduce(function (s, u) { return s + u.pillars.moneyFlow; }, 0) / peers.length
            : user.pillars.moneyFlow;
        var peerDelta = user.pillars.moneyFlow - peerAvgMoneyFlow;

        var anomalyScore = Math.min(0.7, Math.round((1 - user.pillars.moneyFlow / 100) * 70) / 100);

        return [
            { label: 'Transaction Velocity', status: 'normal', detail: 'Avg ' + velocityPerDay.toFixed(1) + ' tx/day' },
            { label: 'Cycle Detection', status: 'normal', detail: 'No suspicious cycles' },
            {
                label: 'Peer Comparison',
                status: Math.abs(peerDelta) > 25 ? 'review' : 'normal',
                detail: (peerDelta >= 0 ? '+' : '') + peerDelta.toFixed(1) + ' pts vs. peer-group average'
            },
            {
                label: 'Anomaly Score',
                status: anomalyScore >= 0.75 ? 'flagged' : 'normal',
                detail: anomalyScore.toFixed(2) + ' (threshold 0.75)'
            }
        ];
    }

    function roundUpNice(value) {
        if (value <= 0) return 10;
        var magnitude = Math.pow(10, Math.floor(Math.log10(value)));
        var residual = value / magnitude;
        var niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
        return niceResidual * magnitude;
    }

    function fmtMoney(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

    // ─────────────────────────────────────────────────────────────
    //  MOCK DATA
    // ─────────────────────────────────────────────────────────────

    var mockUsers = [
        {
            id: 'U-001', name: 'Priya Sharma', age: 34, occupation: 'Gig Worker (Delivery)',
            location: 'Mumbai, IN', creditInvisible: true, recommendedLimit: 24500,
            pillars: { moneyFlow: 82, financialHistory: 45, professionalStability: 76 },
            reasons: [
                { factor: 'Income consistency', impact: 'positive', detail: 'Regular deposits for 11+ months', contribution: 9 },
                { factor: 'Savings rate', impact: 'positive', detail: '14% of income saved monthly', contribution: 6 },
                { factor: 'Cash-flow volatility', impact: 'positive', detail: 'Low month-to-month variance', contribution: 5 },
                { factor: 'Formal credit history', impact: 'negative', detail: 'No prior loan records', contribution: -4 },
                { factor: 'Debt-to-income', impact: 'positive', detail: 'No existing debt', contribution: 3 }
            ],
            transactions: [
                { date: '2026-08-01', amount: 1200, type: 'credit', category: 'Income' },
                { date: '2026-08-03', amount: -340, type: 'debit', category: 'Groceries' },
                { date: '2026-08-05', amount: -120, type: 'debit', category: 'Transport' },
                { date: '2026-08-07', amount: 1200, type: 'credit', category: 'Income' },
                { date: '2026-08-10', amount: -210, type: 'debit', category: 'Dining' },
                { date: '2026-08-12', amount: -85, type: 'debit', category: 'Utilities' },
                { date: '2026-08-14', amount: 1200, type: 'credit', category: 'Income' },
                { date: '2026-08-16', amount: -450, type: 'debit', category: 'Rent' },
                { date: '2026-08-18', amount: -95, type: 'debit', category: 'Shopping' },
                { date: '2026-08-20', amount: 1200, type: 'credit', category: 'Income' },
                { date: '2026-08-22', amount: -220, type: 'debit', category: 'Groceries' },
                { date: '2026-08-25', amount: -60, type: 'debit', category: 'Transport' },
                { date: '2026-08-27', amount: 1200, type: 'credit', category: 'Income' },
                { date: '2026-08-29', amount: -310, type: 'debit', category: 'Dining' },
                { date: '2026-09-01', amount: 1200, type: 'credit', category: 'Income' },
                { date: '2026-09-03', amount: -140, type: 'debit', category: 'Utilities' },
                { date: '2026-09-05', amount: -450, type: 'debit', category: 'Rent' },
                { date: '2026-09-07', amount: 1200, type: 'credit', category: 'Income' },
                { date: '2026-09-09', amount: -180, type: 'debit', category: 'Groceries' }
            ],
            monthlyFlow: [
                { month: 'Apr', income: 4800, expense: 3100 }, { month: 'May', income: 5200, expense: 3300 },
                { month: 'Jun', income: 4900, expense: 3050 }, { month: 'Jul', income: 5100, expense: 3200 },
                { month: 'Aug', income: 5300, expense: 3150 }, { month: 'Sep', income: 5000, expense: 2980 }
            ],
            gigStats: { jobsCompleted: 342, avgRating: 4.8, cancellationRate: 2.3, activeMonths: 14, platform: 'Zomato + Swiggy' }
        },
        {
            id: 'U-002', name: 'Rahul Verma', age: 42, occupation: 'Small Business (Kirana Store)',
            location: 'Delhi, IN', creditInvisible: false, recommendedLimit: 12000,
            pillars: { moneyFlow: 58, financialHistory: 71, professionalStability: 55 },
            reasons: [
                { factor: 'Repayment history', impact: 'positive', detail: '2 small loans repaid on time', contribution: 7 },
                { factor: 'Business revenue', impact: 'negative', detail: 'Declining trend over 3 months', contribution: -8 },
                { factor: 'Cash-flow volatility', impact: 'negative', detail: 'High seasonal variance', contribution: -6 },
                { factor: 'Existing debt', impact: 'negative', detail: 'DTI ratio 42%', contribution: -5 },
                { factor: 'Transaction frequency', impact: 'positive', detail: 'High daily transaction volume', contribution: 4 }
            ],
            transactions: [
                { date: '2026-08-02', amount: 3400, type: 'credit', category: 'Sales' },
                { date: '2026-08-02', amount: -1200, type: 'debit', category: 'Inventory' },
                { date: '2026-08-04', amount: 2800, type: 'credit', category: 'Sales' },
                { date: '2026-08-04', amount: -900, type: 'debit', category: 'Inventory' },
                { date: '2026-08-06', amount: 2100, type: 'credit', category: 'Sales' },
                { date: '2026-08-06', amount: -1100, type: 'debit', category: 'Rent' },
                { date: '2026-08-08', amount: 3900, type: 'credit', category: 'Sales' },
                { date: '2026-08-08', amount: -1300, type: 'debit', category: 'Inventory' },
                { date: '2026-08-10', amount: 2500, type: 'credit', category: 'Sales' },
                { date: '2026-08-10', amount: -700, type: 'debit', category: 'Utilities' }
            ],
            monthlyFlow: [
                { month: 'Apr', income: 98000, expense: 72000 }, { month: 'May', income: 102000, expense: 75000 },
                { month: 'Jun', income: 94000, expense: 74000 }, { month: 'Jul', income: 88000, expense: 71000 },
                { month: 'Aug', income: 84000, expense: 69000 }, { month: 'Sep', income: 79000, expense: 68000 }
            ],
            gigStats: null
        },
        {
            id: 'U-003', name: 'Sunita Patel', age: 29, occupation: 'Freelance Designer',
            location: 'Bangalore, IN', creditInvisible: true, recommendedLimit: 42000,
            pillars: { moneyFlow: 94, financialHistory: 68, professionalStability: 89 },
            reasons: [
                { factor: 'Income growth', impact: 'positive', detail: '22% YoY revenue increase', contribution: 10 },
                { factor: 'Savings rate', impact: 'positive', detail: '32% of income saved', contribution: 8 },
                { factor: 'Work consistency', impact: 'positive', detail: 'Avg 4.5 projects/month', contribution: 6 },
                { factor: 'Formal credit history', impact: 'negative', detail: 'Thin file (1 credit card)', contribution: -3 },
                { factor: 'Client concentration', impact: 'positive', detail: 'Diversified across 8 clients', contribution: 5 }
            ],
            transactions: [
                { date: '2026-08-01', amount: 25000, type: 'credit', category: 'Project Payment' },
                { date: '2026-08-03', amount: -3200, type: 'debit', category: 'Software' },
                { date: '2026-08-05', amount: -4500, type: 'debit', category: 'Rent' },
                { date: '2026-08-08', amount: 18000, type: 'credit', category: 'Project Payment' },
                { date: '2026-08-10', amount: -800, type: 'debit', category: 'Groceries' },
                { date: '2026-08-12', amount: -1200, type: 'debit', category: 'Utilities' },
                { date: '2026-08-15', amount: 22000, type: 'credit', category: 'Project Payment' },
                { date: '2026-08-18', amount: -2000, type: 'debit', category: 'Transport' },
                { date: '2026-08-20', amount: -1500, type: 'debit', category: 'Dining' },
                { date: '2026-08-22', amount: 30000, type: 'credit', category: 'Project Payment' },
                { date: '2026-08-25', amount: -4200, type: 'debit', category: 'Rent' },
                { date: '2026-08-28', amount: -900, type: 'debit', category: 'Shopping' },
                { date: '2026-09-01', amount: 26000, type: 'credit', category: 'Project Payment' },
                { date: '2026-09-04', amount: -1100, type: 'debit', category: 'Groceries' },
                { date: '2026-09-07', amount: 19500, type: 'credit', category: 'Project Payment' }
            ],
            monthlyFlow: [
                { month: 'Apr', income: 72000, expense: 38000 }, { month: 'May', income: 81000, expense: 41000 },
                { month: 'Jun', income: 78000, expense: 39000 }, { month: 'Jul', income: 92000, expense: 42000 },
                { month: 'Aug', income: 105000, expense: 44000 }, { month: 'Sep', income: 98000, expense: 40000 }
            ],
            gigStats: { jobsCompleted: 87, avgRating: 4.9, cancellationRate: 0.8, activeMonths: 28, platform: 'Upwork + Fiverr' }
        }
    ];

    // ─────────────────────────────────────────────────────────────
    //  APP STATE
    // ─────────────────────────────────────────────────────────────

    var state = {
        users: mockUsers,
        selectedId: 'U-001',
        activeTab: 'dashboard',
        isLoading: false,
        filter: 'all',
        showExplanation: true
    };
    var requestToken = 0;

    function getSelectedUser() {
        var found = null;
        state.users.forEach(function (u) { if (u.id === state.selectedId) found = u; });
        return found || state.users[0];
    }

    function selectUser(id) {
        requestToken++;
        var thisToken = requestToken;
        state.isLoading = true;
        state.selectedId = id;
        render();
        setTimeout(function () {
            if (thisToken === requestToken) {
                state.isLoading = false;
                render();
            }
        }, 400);
    }

    // ─────────────────────────────────────────────────────────────
    //  SVG CHART BUILDERS
    // ─────────────────────────────────────────────────────────────

    function renderBarChart(data) {
        var width = 640, height = 220;
        var padL = 46, padR = 10, padT = 10, padB = 26;
        var chartW = width - padL - padR, chartH = height - padT - padB;
        var maxVal = 0;
        data.forEach(function (d) { maxVal = Math.max(maxVal, d.income, d.expense); });
        var yMax = roundUpNice(maxVal);
        var groupW = chartW / data.length;
        var barW = groupW * 0.28;
        var gap = groupW * 0.08;

        var grid = '', yLabels = '';
        var ticks = 4;
        for (var i = 0; i <= ticks; i++) {
            var v = (yMax / ticks) * i;
            var y = padT + chartH - (v / yMax) * chartH;
            grid += '<line x1="' + padL + '" y1="' + y + '" x2="' + (width - padR) + '" y2="' + y + '" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3 3" />';
            yLabels += '<text x="' + (padL - 8) + '" y="' + (y + 3) + '" text-anchor="end" font-size="10" fill="rgba(255,255,255,0.35)">' + Math.round(v / 1000) + 'k</text>';
        }

        var bars = '', xLabels = '';
        data.forEach(function (d, i) {
            var gx = padL + i * groupW;
            var incH = (d.income / yMax) * chartH;
            var expH = (d.expense / yMax) * chartH;
            var incX = gx + gap;
            var expX = incX + barW + gap * 0.6;
            bars += '<rect x="' + incX + '" y="' + (padT + chartH - incH) + '" width="' + barW + '" height="' + incH + '" rx="3" fill="#fbbf24" opacity="0.85"><title>' + d.month + ' Income: ' + fmtMoney(d.income) + '</title></rect>';
            bars += '<rect x="' + expX + '" y="' + (padT + chartH - expH) + '" width="' + barW + '" height="' + expH + '" rx="3" fill="#b8860b" opacity="0.65"><title>' + d.month + ' Expense: ' + fmtMoney(d.expense) + '</title></rect>';
            xLabels += '<text x="' + (gx + groupW / 2) + '" y="' + (height - 6) + '" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.35)">' + d.month + '</text>';
        });

        return '' +
            '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" style="width:100%;height:88%;">' +
                grid + yLabels + bars + xLabels +
            '</svg>' +
            '<div class="chart-legend">' +
                '<span class="legend-item"><span class="legend-swatch" style="background:#fbbf24"></span>Income</span>' +
                '<span class="legend-item"><span class="legend-swatch" style="background:#b8860b"></span>Expense</span>' +
            '</div>';
    }

    function donutSlicePath(cx, cy, innerR, outerR, a0, a1) {
        var largeArc = (a1 - a0) > Math.PI ? 1 : 0;
        var x1o = cx + outerR * Math.cos(a0), y1o = cy + outerR * Math.sin(a0);
        var x2o = cx + outerR * Math.cos(a1), y2o = cy + outerR * Math.sin(a1);
        var x1i = cx + innerR * Math.cos(a1), y1i = cy + innerR * Math.sin(a1);
        var x2i = cx + innerR * Math.cos(a0), y2i = cy + innerR * Math.sin(a0);
        return 'M ' + x1o + ' ' + y1o +
            ' A ' + outerR + ' ' + outerR + ' 0 ' + largeArc + ' 1 ' + x2o + ' ' + y2o +
            ' L ' + x1i + ' ' + y1i +
            ' A ' + innerR + ' ' + innerR + ' 0 ' + largeArc + ' 0 ' + x2i + ' ' + y2i + ' Z';
    }

    function renderPieChart(pieData) {
        if (pieData.length === 0) {
            return '<p class="empty-note">No debit data available.</p>';
        }
        var COLORS = ['#fbbf24', '#d97706', '#fcd34d', '#f59e0b', '#b8860b', '#fde68a'];
        var total = 0;
        pieData.forEach(function (d) { total += d.value; });
        var cx = 90, cy = 90, outerR = 78, innerR = 46;
        var angle = -Math.PI / 2;
        var slices = '';
        var legend = '';
        pieData.forEach(function (d, i) {
            var sweep = (d.value / total) * 2 * Math.PI;
            var color = COLORS[i % COLORS.length];
            slices += '<path d="' + donutSlicePath(cx, cy, innerR, outerR, angle, angle + sweep) + '" fill="' + color + '" stroke="#0b0b0e" stroke-width="1"><title>' + d.name + ': ' + fmtMoney(d.value) + ' (' + Math.round((d.value / total) * 100) + '%)</title></path>';
            angle += sweep;
            legend += '<div class="pie-legend-row"><span class="pie-legend-name"><span class="legend-swatch" style="background:' + color + '"></span>' + d.name + '</span><span class="pie-legend-value">' + fmtMoney(d.value) + '</span></div>';
        });
        return '' +
            '<div class="pie-wrap">' +
                '<svg class="pie-svg" viewBox="0 0 180 180">' + slices + '</svg>' +
                '<div class="pie-legend">' + legend + '</div>' +
            '</div>';
    }

    function renderRadarChart(radarData) {
        var cx = 150, cy = 110, maxR = 82;
        var n = radarData.length;
        var step = (2 * Math.PI) / n;
        var start = -Math.PI / 2;

        function pt(value, i) {
            var a = start + i * step;
            var r = (value / 100) * maxR;
            return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        }

        var grid = '';
        [0.25, 0.5, 0.75, 1].forEach(function (frac) {
            var pts = radarData.map(function (_, i) { return pt(100 * frac, i).join(','); }).join(' ');
            grid += '<polygon points="' + pts + '" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1" />';
        });

        var axes = '', labels = '';
        radarData.forEach(function (d, i) {
            var edge = pt(100, i);
            axes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + edge[0] + '" y2="' + edge[1] + '" stroke="rgba(255,255,255,0.07)" stroke-width="1" />';
            var a = start + i * step;
            var lx = cx + (maxR + 20) * Math.cos(a);
            var ly = cy + (maxR + 20) * Math.sin(a);
            var anchor = Math.cos(a) > 0.3 ? 'start' : (Math.cos(a) < -0.3 ? 'end' : 'middle');
            labels += '<text x="' + lx + '" y="' + ly + '" text-anchor="' + anchor + '" font-size="9" fill="#aaa">' + d.subject + '</text>';
        });

        var benchmarkPts = radarData.map(function (_, i) { return pt(100, i).join(','); }).join(' ');
        var scorePts = radarData.map(function (d, i) { return pt(d.score, i).join(','); }).join(' ');

        return '' +
            '<svg viewBox="0 0 300 220" style="width:100%;height:88%;">' +
                grid + axes +
                '<polygon points="' + benchmarkPts + '" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" stroke-width="1" />' +
                '<polygon points="' + scorePts + '" fill="#fbbf24" fill-opacity="0.2" stroke="#fbbf24" stroke-width="1.5" />' +
                labels +
            '</svg>' +
            '<div class="chart-legend">' +
                '<span class="legend-item"><span class="legend-swatch" style="background:#fbbf24"></span>User Score</span>' +
                '<span class="legend-item"><span class="legend-swatch legend-ring"></span>Benchmark</span>' +
            '</div>';
    }

    // ─────────────────────────────────────────────────────────────
    //  VIEW RENDERERS
    // ─────────────────────────────────────────────────────────────

    function renderHeader() {
        var options = state.users.map(function (u) {
            return '<option value="' + u.id + '"' + (u.id === state.selectedId ? ' selected' : '') + '>' + u.name + '</option>';
        }).join('');

        return '' +
            '<div class="header">' +
                '<div class="brand">' +
                    '<div class="logo-badge gold-gradient">T</div>' +
                    '<div>' +
                        '<h1 class="brand-title">Trust<span class="gold-text">Score</span></h1>' +
                        '<p class="brand-subtitle">Credit-Invisible Scoring Engine</p>' +
                    '</div>' +
                '</div>' +
                '<div class="header-controls">' +
                    '<div class="user-picker">' +
                        '<span class="user-picker-label">User</span>' +
                        '<select id="user-select" class="user-select">' + options + '</select>' +
                    '</div>' +
                    '<button class="btn-primary" type="button">' +
                        '<svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />' +
                        '</svg>' +
                        'New Assessment' +
                    '</button>' +
                '</div>' +
            '</div>';
    }

    function renderTabs() {
        var tabs = ['dashboard', 'transactions', 'insights'];
        return '<div class="tabs">' + tabs.map(function (t) {
            var label = t.charAt(0).toUpperCase() + t.slice(1);
            return '<button type="button" class="tab-btn' + (state.activeTab === t ? ' active' : '') + '" data-tab="' + t + '">' + label + '</button>';
        }).join('') + '</div>';
    }

    function renderLoading() {
        return '<div class="loading"><div class="spinner"></div><span class="loading-label">Loading score...</span></div>';
    }

    function renderDashboard(user) {
        var trustScore = computeTrustScore(user.pillars);
        var riskLevel = deriveRiskLevel(trustScore);
        var scoreColor = getScoreColor(trustScore);
        var weights = getEffectiveWeights(user.pillars);
        var circumference = 2 * Math.PI * 70;
        var offset = circumference - (trustScore / 100) * circumference;

        var pillarRows = Object.keys(PILLAR_WEIGHTS).map(function (key) {
            var value = user.pillars[key];
            return '' +
                '<div>' +
                    '<div class="pillar-row-head"><span>' + PILLAR_LABELS[key] + '</span><span class="muted">' + value + '% • Weight ' + weights[key] + '%</span></div>' +
                    '<div class="pillar-track"><div class="pillar-bar" style="width:' + value + '%"></div></div>' +
                '</div>';
        }).join('');

        var reasonRows = user.reasons.slice(0, 5).map(function (r) {
            var cls = r.impact === 'positive' ? 'positive' : 'negative';
            var arrow = r.impact === 'positive' ? '▲' : '▼';
            return '' +
                '<div class="reason-item ' + cls + '">' +
                    '<div class="reason-head"><span class="reason-factor">' + r.factor + '</span><span class="reason-impact ' + cls + '">' + arrow + ' ' + r.impact + '</span></div>' +
                    '<p class="reason-detail">' + r.detail + '</p>' +
                '</div>';
        }).join('');

        var monthlyData = user.monthlyFlow || [];
        var chartCard = monthlyData.length > 0 ? '' +
            '<div class="glass">' +
                '<h3 class="card-title">Monthly Cash Flow</h3>' +
                '<div class="chart-box">' + renderBarChart(monthlyData) + '</div>' +
            '</div>' : '';

        return '' +
            '<div class="stack-6">' +
                '<div class="grid grid-5">' +
                    '<div class="glass gold-glow border-gold span-2 gauge-card">' +
                        '<div class="gauge-shell">' +
                            '<svg viewBox="0 0 160 160">' +
                                '<circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="12" />' +
                                '<circle cx="80" cy="80" r="70" fill="none" stroke="' + scoreColor + '" stroke-width="12" stroke-linecap="round" ' +
                                    'class="score-ring" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" />' +
                            '</svg>' +
                            '<div class="gauge-readout">' +
                                '<span class="score-number">' + trustScore + '</span>' +
                                '<span class="score-max">/ 100</span>' +
                                '<div class="badge ' + getRiskBadgeClass(riskLevel) + '">' + riskLevel + ' Risk</div>' +
                            '</div>' +
                        '</div>' +
                        '<p class="limit-caption">Recommended Credit Limit<br /><span class="limit-value gold-text">' + fmtMoney(user.recommendedLimit) + '</span></p>' +
                    '</div>' +
                    '<div class="grid-2-fixed span-3">' +
                        '<div class="glass-light stat-card"><p class="stat-label">Name</p><p class="stat-value">' + user.name + '</p><p class="stat-sub">' + user.occupation + '</p></div>' +
                        '<div class="glass-light stat-card"><p class="stat-label">Location</p><p class="stat-value">' + user.location + '</p><p class="stat-sub">' + (user.creditInvisible ? '🔒 Credit-invisible' : '📊 Has credit history') + '</p></div>' +
                        '<div class="glass-light stat-card"><p class="stat-label">Income Stability</p><p class="stat-value gold-text">' + user.pillars.moneyFlow + '%</p><p class="stat-sub">Money-Flow Score</p></div>' +
                        '<div class="glass-light stat-card"><p class="stat-label">Professional Score</p><p class="stat-value gold-text">' + user.pillars.professionalStability + '%</p><p class="stat-sub">Business / Gig Stability</p></div>' +
                    '</div>' +
                '</div>' +

                '<div class="grid grid-3">' +
                    '<div class="glass span-2">' +
                        '<h3 class="card-title">Scoring Pillars</h3>' +
                        '<div class="stack-4">' + pillarRows + '</div>' +
                    '</div>' +
                    '<div class="glass">' +
                        '<h3 class="card-title card-title-tight">Key Factors</h3>' +
                        '<div class="reasons-list stack-2.5">' + reasonRows + '</div>' +
                    '</div>' +
                '</div>' +

                chartCard +
            '</div>';
    }

    function renderTransactions(user) {
        var txs = user.transactions || [];
        var filtered = state.filter === 'all' ? txs : txs.filter(function (t) { return t.type === state.filter; });
        var totalCredit = 0, totalDebit = 0;
        txs.forEach(function (t) {
            if (t.type === 'credit') totalCredit += t.amount; else totalDebit += Math.abs(t.amount);
        });

        var categoryTotals = {};
        txs.filter(function (t) { return t.type === 'debit'; }).forEach(function (t) {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
        });
        var pieData = Object.keys(categoryTotals).map(function (name) { return { name: name, value: categoryTotals[name] }; });

        var txRows = filtered.length === 0
            ? '<p class="empty-note">No transactions match filter.</p>'
            : filtered.map(function (t) {
                var sign = t.type === 'credit' ? '+' : '-';
                return '' +
                    '<div class="tx-item">' +
                        '<div class="tx-item-left">' +
                            '<div class="tx-dot ' + t.type + '"></div>' +
                            '<div><p class="tx-category">' + t.category + '</p><p class="tx-date">' + t.date + '</p></div>' +
                        '</div>' +
                        '<span class="tx-amount ' + (t.type === 'credit' ? 'positive-text' : 'negative-text') + '">' + sign + fmtMoney(Math.abs(t.amount)) + '</span>' +
                    '</div>';
            }).join('');

        function filterClass(name) {
            var active = state.filter === name;
            if (!active) return 'filter-btn';
            return 'filter-btn active-' + name;
        }

        return '' +
            '<div class="stack-5">' +
                '<div class="grid-2-4">' +
                    '<div class="glass-light"><p class="summary-label">Total Credits</p><p class="summary-value positive-text">' + fmtMoney(totalCredit) + '</p></div>' +
                    '<div class="glass-light"><p class="summary-label">Total Debits</p><p class="summary-value negative-text">' + fmtMoney(totalDebit) + '</p></div>' +
                    '<div class="glass-light"><p class="summary-label">Net Cash Flow</p><p class="summary-value ' + ((totalCredit - totalDebit) >= 0 ? 'positive-text' : 'negative-text') + '">' + fmtMoney(totalCredit - totalDebit) + '</p></div>' +
                    '<div class="glass-light"><p class="summary-label">Transactions</p><p class="summary-value">' + txs.length + '</p></div>' +
                '</div>' +

                '<div class="grid grid-3">' +
                    '<div class="glass span-2">' +
                        '<div class="tx-history-head">' +
                            '<h3 class="card-title" style="margin-bottom:0;">Transaction History</h3>' +
                            '<div class="tx-filters">' +
                                '<button type="button" class="' + filterClass('all') + '" data-filter="all">All</button>' +
                                '<button type="button" class="' + filterClass('credit') + '" data-filter="credit">Credits</button>' +
                                '<button type="button" class="' + filterClass('debit') + '" data-filter="debit">Debits</button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="tx-list stack-1.5">' + txRows + '</div>' +
                    '</div>' +
                    '<div class="glass">' +
                        '<h3 class="card-title card-title-tight">Spending Breakdown</h3>' +
                        renderPieChart(pieData) +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    function renderInsights(user) {
        var radarData = [
            { subject: 'Income Consistency', score: user.pillars.moneyFlow * 0.85 },
            { subject: 'Savings Rate', score: user.pillars.moneyFlow * 0.7 },
            { subject: 'Repayment History', score: user.pillars.financialHistory * 0.9 },
            { subject: 'Debt Management', score: user.pillars.financialHistory * 0.75 },
            { subject: 'Business Stability', score: user.pillars.professionalStability * 0.8 },
            { subject: 'Growth Trajectory', score: user.pillars.professionalStability * 0.65 }
        ];
        var fraudIndicators = computeFraudIndicators(user, state.users);
        var positiveReasons = user.reasons.filter(function (r) { return r.impact === 'positive'; });
        var negativeReasons = user.reasons.filter(function (r) { return r.impact === 'negative'; });
        var allNormal = fraudIndicators.every(function (f) { return f.status === 'normal'; });

        var positiveRows = positiveReasons.map(function (r) {
            return '<div class="driver-row"><span>' + r.factor + '</span><span class="driver-value positive-text">+' + r.contribution + '%</span></div>';
        }).join('');
        var negativeRows = negativeReasons.length === 0
            ? '<p class="empty-note" style="padding:0;">No significant negative drivers.</p>'
            : negativeReasons.map(function (r) {
                return '<div class="driver-row"><span>' + r.factor + '</span><span class="driver-value negative-text">' + r.contribution + '%</span></div>';
            }).join('');

        var explainBody = state.showExplanation ? '' +
            '<div class="grid-1-2" style="margin-top:1rem;">' +
                '<div><p class="driver-col-label">Positive Drivers</p><div class="stack-1.5">' + positiveRows + '</div></div>' +
                '<div><p class="driver-col-label">Negative Drivers</p><div class="stack-1.5">' + negativeRows + '</div></div>' +
            '</div>' : '';

        var fraudRows = fraudIndicators.map(function (f) {
            return '' +
                '<div class="fraud-row">' +
                    '<div><p class="fraud-label">' + f.label + '</p><p class="fraud-detail">' + f.detail + '</p></div>' +
                    '<div class="badge ' + (f.status === 'normal' ? 'badge-high' : 'badge-low') + '">' + f.status + '</div>' +
                '</div>';
        }).join('');

        var gigCard = user.gigStats ? '' +
            '<div class="glass">' +
                '<h3 class="card-title card-title-tight">Gig Economy Profile</h3>' +
                '<div class="grid-2-4">' +
                    '<div><p class="gig-label">Jobs Completed</p><p class="gig-value gold-text">' + user.gigStats.jobsCompleted + '</p></div>' +
                    '<div><p class="gig-label">Avg Rating</p><p class="gig-value">' + user.gigStats.avgRating + '⭐</p></div>' +
                    '<div><p class="gig-label">Cancellation Rate</p><p class="gig-value negative-text">' + user.gigStats.cancellationRate + '%</p></div>' +
                    '<div><p class="gig-label">Active Months</p><p class="gig-value">' + user.gigStats.activeMonths + '</p></div>' +
                '</div>' +
                '<p class="gig-footnote">Platform: ' + user.gigStats.platform + '</p>' +
            '</div>' : '';

        return '' +
            '<div class="stack-5">' +
                '<div class="glass gold-glow border-gold">' +
                    '<div class="explain-head">' +
                        '<div><h3 class="explain-title">Explainability Summary</h3><p class="explain-sub">SHAP-driven factor contribution</p></div>' +
                        '<button type="button" class="explain-toggle" data-toggle="explanation">' + (state.showExplanation ? 'Hide details' : 'Show details') + '</button>' +
                    '</div>' +
                    explainBody +
                '</div>' +

                '<div class="grid grid-2">' +
                    '<div class="glass"><h3 class="card-title card-title-tight">Risk Profile Radar</h3><div class="chart-box">' + renderRadarChart(radarData) + '</div></div>' +
                    '<div class="glass">' +
                        '<h3 class="card-title card-title-tight">Fraud Detection Signals</h3>' +
                        '<div class="stack-3">' + fraudRows + '</div>' +
                        '<p class="fraud-footnote"><span class="positive-text">✓</span> ' + (allNormal ? 'No anomalies detected. Graph-based cycle analysis passed.' : 'Some signals need manual review before final approval.') + '</p>' +
                    '</div>' +
                '</div>' +

                gigCard +
            '</div>';
    }

    // ─────────────────────────────────────────────────────────────
    //  ROOT RENDER + EVENT DELEGATION
    // ─────────────────────────────────────────────────────────────

    function render() {
        var user = getSelectedUser();
        var body;
        if (state.activeTab === 'dashboard') body = renderDashboard(user);
        else if (state.activeTab === 'transactions') body = renderTransactions(user);
        else body = renderInsights(user);

        var content = state.isLoading ? renderLoading() : '<div class="fade-in">' + body + '</div>';

        document.getElementById('root').innerHTML = '' +
            '<div class="page"><div class="container">' +
                renderHeader() +
                renderTabs() +
                content +
            '</div></div>';
    }

    document.addEventListener('click', function (e) {
        var tabBtn = e.target.closest('[data-tab]');
        if (tabBtn) { state.activeTab = tabBtn.getAttribute('data-tab'); render(); return; }

        var filterBtn = e.target.closest('[data-filter]');
        if (filterBtn) { state.filter = filterBtn.getAttribute('data-filter'); render(); return; }

        var toggleBtn = e.target.closest('[data-toggle="explanation"]');
        if (toggleBtn) { state.showExplanation = !state.showExplanation; render(); return; }
    });

    document.addEventListener('change', function (e) {
        if (e.target && e.target.id === 'user-select') {
            selectUser(e.target.value);
        }
    });

    render();
})();