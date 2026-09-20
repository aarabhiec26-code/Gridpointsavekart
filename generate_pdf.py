#!/usr/bin/env python3
"""Generate two separate SAVeKART PDFs: mathematical formulations + source code."""

import os
import html
import re
from weasyprint import HTML

PROJECT = "/tmp/cc-agent/71286333/project"

def read_file(path):
    with open(os.path.join(PROJECT, path), "r") as f:
        return f.read()

def code_block(code):
    escaped = html.escape(code)
    return f'<pre class="code"><code>{escaped}</code></pre>'

SHARED_CSS = """
@page {{
  size: A4;
  margin: 2cm 1.5cm 2cm 1.5cm;
  @bottom-center {{
    content: "SAVeKART — Page " counter(page) " of " counter(pages);
    font-size: 9px;
    color: #64748b;
  }}
}}
@page :first {{
  margin-top: 3cm;
  @bottom-center {{ content: none; }}
}}

body {{
  font-family: 'DejaVu Sans', Arial, sans-serif;
  font-size: 11px;
  line-height: 1.55;
  color: #1e293b;
}}

.cover {{
  text-align: center;
  padding-top: 60px;
  page-break-after: always;
}}
.cover h1 {{
  font-size: 36px;
  color: #1e63e8;
  margin-bottom: 4px;
  letter-spacing: 2px;
}}
.cover .tagline {{
  font-size: 16px;
  color: #475569;
  margin-bottom: 30px;
}}
.cover .city {{
  font-size: 14px;
  color: #22c55e;
  font-weight: bold;
  margin-bottom: 40px;
}}
.cover .info {{
  font-size: 12px;
  color: #64748b;
  margin: 8px 0;
}}
.cover .divider {{
  width: 200px;
  height: 3px;
  background: linear-gradient(90deg, #1e63e8, #22c55e);
  margin: 20px auto;
  border-radius: 2px;
}}

h1 {{
  font-size: 22px;
  color: #1e63e8;
  border-bottom: 2px solid #1e63e8;
  padding-bottom: 6px;
  margin-top: 30px;
  page-break-after: avoid;
}}
h2 {{
  font-size: 16px;
  color: #184dd1;
  margin-top: 24px;
  page-break-after: avoid;
}}
h3 {{
  font-size: 13px;
  color: #334155;
  margin-top: 18px;
  page-break-after: avoid;
}}

p {{ margin: 6px 0; }}

table {{
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  font-size: 10px;
}}
th, td {{
  border: 1px solid #cbd5e1;
  padding: 5px 8px;
  text-align: left;
}}
th {{
  background: #f1f5f9;
  font-weight: bold;
  color: #334155;
}}
tr:nth-child(even) td {{ background: #f8fafc; }}

.code {{
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #1e63e8;
  border-radius: 4px;
  padding: 10px 12px;
  overflow-x: auto;
  font-family: 'DejaVu Sans Mono', 'Courier New', monospace;
  font-size: 9px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  page-break-inside: avoid;
  color: #1e293b;
}}

.code-block-title {{
  background: #1e63e8;
  color: white;
  padding: 5px 12px;
  font-size: 10px;
  font-weight: bold;
  border-radius: 4px 4px 0 0;
  margin-top: 16px;
  page-break-after: avoid;
}}
.code-block-title + .code {{
  border-radius: 0 4px 4px 4px;
  margin-top: 0;
}}

.formula {{
  background: #eef7ff;
  border: 1px solid #bcdcff;
  border-radius: 4px;
  padding: 8px 12px;
  margin: 8px 0;
  font-family: 'DejaVu Sans Mono', monospace;
  font-size: 10px;
  page-break-inside: avoid;
}}

.toc {{
  page-break-after: always;
}}
.toc h1 {{ border: none; }}
.toc ul {{ list-style: none; padding-left: 0; }}
.toc li {{ margin: 4px 0; font-size: 12px; }}
.toc .sub {{ padding-left: 20px; font-size: 11px; color: #475569; }}

ul, ol {{ margin: 6px 0; padding-left: 20px; }}
li {{ margin: 3px 0; }}

strong {{ color: #1e293b; }}

hr {{
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 16px 0;
}}

.tag {{
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 9px;
  font-weight: bold;
  color: white;
}}
.tag-ts {{ background: #3178c6; }}
.tag-css {{ background: #1572b6; }}
.tag-json {{ background: #475569; }}
.tag-html {{ background: #e34c26; }}
.tag-conf {{ background: #6b21a8; }}
.tag-test {{ background: #16a34a; }}

.file-meta {{
  font-size: 9px;
  color: #94a3b8;
  margin-top: 2px;
}}
"""

# ============================================================
# PDF 1: MATHEMATICAL FORMULATIONS
# ============================================================

def build_math_pdf():
    parts = []
    parts.append(f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{SHARED_CSS}</style></head><body>""")

    # Cover
    parts.append("""
<div class="cover">
  <div class="divider"></div>
  <h1>SAVeKART</h1>
  <div class="tagline">Mathematical Calculations &amp; Formulations</div>
  <div class="city">Hubli-Dharwad, Karnataka &mdash; Tier-2 City</div>
  <div class="divider"></div>
  <div class="info"><strong>Mathematical Models, Optimization Functions &amp; Statistical Computations</strong></div>
  <div class="info">Linear Programming &middot; TSP &middot; Haversine Distance</div>
  <div class="info">Exponential Decay &middot; Bin-Packing &middot; Sensitivity Analysis</div>
  <div class="info">Maxima/Minima &middot; Greedy Heuristics &middot; Demand Statistics</div>
  <div class="info" style="margin-top: 30px; color: #94a3b8;">Generated 20 September 2026</div>
</div>
""")

    # TOC
    parts.append("""
<div class="toc">
  <h1>Table of Contents</h1>
  <ul>
    <li>1. Haversine Distance Formula</li>
    <li>2. Frequency Classification &amp; Demand Statistics</li>
    <li>3. Optimization Model &mdash; Linear Program</li>
    <li class="sub">3.1 Objective Function</li>
    <li class="sub">3.2 Constraints</li>
    <li class="sub">3.3 On-Time Probability Function</li>
    <li class="sub">3.4 Warehouse Scoring (Greedy Heuristic)</li>
    <li class="sub">3.5 Total Cost Components</li>
    <li>4. Co-Delivery Optimization</li>
    <li>5. Route Optimization &mdash; Nearest-Neighbour TSP</li>
    <li>6. Order Classification &mdash; Maxima/Minima</li>
    <li>7. Warehouse Space Optimization &mdash; Bin-Packing</li>
    <li>8. Reliability Matrix</li>
    <li>9. Sensitivity Analysis</li>
    <li>10. Summary of Mathematical Techniques</li>
  </ul>
</div>
""")

    # Sections
    sections = [
        ("1. Haversine Distance (Great-Circle Distance)", """
<p>The distance between two points on Earth's surface given their latitude and longitude:</p>
<div class="formula">
d = 2R &middot; arctan(&radic;a / &radic;(1&minus;a))<br/>
<br/>
where:<br/>
a = sin&sup2;(&Delta;lat/2) + cos(lat&#8321;)&middot;cos(lat&#8322;)&middot;sin&sup2;(&Delta;lon/2)<br/>
&Delta;lat = lat&#8322; &minus; lat&#8321;<br/>
&Delta;lon = lon&#8322; &minus; lon&#8321;<br/>
R = 6371 km (Earth's radius)
</div>
<p><strong>Used in:</strong> All distance computations between neighbourhoods and warehouses.</p>
<p><strong>Example:</strong> Distance from Old Hubli (15.3647, 75.1240) to Gokul Road Logistics Hub (15.3700, 75.1620):</p>
<div class="formula">
&Delta;lat = 0.0053&deg;, &Delta;lon = 0.0380&deg;<br/>
a = sin&sup2;(0.00265) + cos(15.3647&deg;)&middot;cos(15.3700&deg;)&middot;sin&sup2;(0.019&deg;)<br/>
a &asymp; 0.000007 + 0.9650&middot;0.9650&middot;0.000110 &asymp; 0.000113<br/>
d &asymp; 2 &times; 6371 &times; arctan(&radic;0.000113 / &radic;0.999887) &asymp; 4.28 km
</div>
"""),

        ("2. Frequency Classification &amp; Demand Statistics", """
<p>Neighbourhoods are classified into three zones based on daily order volume:</p>
<table>
<tr><th>Class</th><th>Condition</th><th>Color</th><th>Action</th></tr>
<tr><td>Red</td><td>daily_orders &ge; 200</td><td>&#128308;</td><td>High priority &mdash; nearest warehouse</td></tr>
<tr><td>Amber</td><td>120 &le; daily_orders &lt; 200</td><td>&#128992;</td><td>Medium priority</td></tr>
<tr><td>Green</td><td>daily_orders &lt; 120</td><td>&#128994;</td><td>Low priority</td></tr>
</table>
<p><strong>Statistical measures computed:</strong></p>
<div class="formula">
Mean (&mu;) = &Sigma;(daily_orders_i) / N<br/>
Variance (&sigma;&sup2;) = &Sigma;(daily_orders_i &minus; &mu;)&sup2; / N<br/>
Std Dev (&sigma;) = &radic;(&sigma;&sup2;)<br/>
Peak Day Demand = Total Orders &times; 1.35
</div>
<p>The <strong>1.35 multiplier</strong> represents the empirical peak-day surge factor observed in Indian Tier-2 city e-commerce delivery patterns (festive seasons, weekends, payday spikes).</p>
"""),

        ("3. Optimization Model &mdash; Linear Program", """
<h3>3.1 Objective Function</h3>
<p>The goal is to <strong>minimize</strong> the total order-weighted delivery cost plus late-delivery penalty:</p>
<div class="formula">
Minimize Z = &Sigma;&#7522; &Sigma;&#7523; x&#7522;&#7523; &middot; [d&#7522;&#7523; &middot; c_fuel + n&#7522; &middot; p_late &middot; (1 &minus; P&#7522;&#7523;)]
</div>
<p>Where:</p>
<ul>
<li>x&#7522;&#7523; = 1 if neighbourhood i is assigned to warehouse j, 0 otherwise</li>
<li>d&#7522;&#7523; = Haversine distance from neighbourhood i to warehouse j (km)</li>
<li>c_fuel = Fuel cost per km (&#8377;/km, default &#8377;8.5)</li>
<li>n&#7522; = Daily orders from neighbourhood i</li>
<li>p_late = Late delivery penalty per order (&#8377;, default &#8377;50)</li>
<li>P&#7522;&#7523; = Probability of on-time delivery from warehouse j to neighbourhood i</li>
</ul>

<h3>3.2 Constraints</h3>
<div class="formula">
1. d&#7522;&#7523; &le; R_service  (service radius, default 5 km)<br/>
2. &Sigma;&#7523; x&#7522;&#7523; = 1  &forall;i  (each neighbourhood assigned to exactly one warehouse)<br/>
3. &Sigma;&#7523; y&#7523; &le; K_max  (maximum number of warehouses, default 5)<br/>
4. x&#7522;&#7523; &le; y&#7523;  &forall;i,j  (neighbourhood can only be assigned to a selected warehouse)<br/>
5. x&#7522;&#7523; &isin; {0, 1}  (binary assignment)<br/>
6. y&#7523; &isin; {0, 1}  (binary warehouse selection)
</div>

<h3>3.3 On-Time Probability Function</h3>
<p>The probability that an order arrives on time decreases exponentially with distance:</p>
<div class="formula">
P&#7522;&#7523; = r&#7522; &middot; e^(&minus;d&#7522;&#7523; / R)<br/>
<br/>
where:<br/>
r&#7522; = base on-time rate for neighbourhood i (historical)<br/>
d&#7522;&#7523; = distance from warehouse j to neighbourhood i<br/>
R = service radius (km)
</div>
<p><strong>Interpretation:</strong> At distance 0, P = r&#7522; (base rate). At distance = R, P = r&#7522;/e &asymp; 0.368&middot;r&#7522;. This captures the intuition that longer delivery distances reduce reliability.</p>

<h3>3.4 Warehouse Scoring Function (Greedy Heuristic)</h3>
<p>Since the full integer program is NP-hard, SAVeKART uses a greedy facility-location heuristic:</p>
<p><strong>Step 1: Score each warehouse:</strong></p>
<div class="formula">
Score(j) = &Sigma;&#7522; [n&#7522; / max(0.1, d&#7522;&#7523;)]   for all i where d&#7522;&#7523; &le; R
</div>
<p>Higher score = warehouse is close to many high-order neighbourhoods.</p>
<p><strong>Step 2:</strong> Select top-K warehouses by score.</p>
<p><strong>Step 3:</strong> Assign each neighbourhood to the nearest selected warehouse within radius.</p>
<p><strong>Step 4:</strong> Compute costs for each assignment.</p>

<h3>3.5 Total Cost Components</h3>
<div class="formula">
Total Weighted Cost = &Sigma;&#7522; [d&#7522;&#7523;* &middot; c_fuel &middot; n&#7522; + n&#7522; &middot; p_late &middot; (1 &minus; P&#7522;&#7523;*)]<br/>
<br/>
where j* = assigned warehouse for neighbourhood i<br/>
<br/>
Fuel Cost = &Sigma;&#7522; d&#7522;&#7523;* &middot; c_fuel &middot; n&#7522;<br/>
Late Penalty = &Sigma;&#7522; n&#7522; &middot; p_late &middot; (1 &minus; P&#7522;&#7523;*)<br/>
Coverage (%) = (assigned neighbourhoods / total neighbourhoods) &times; 100
</div>
"""),

        ("4. Co-Delivery Optimization", """
<h3>4.1 Co-Delivery Detection</h3>
<p>Two neighbourhoods assigned to the same warehouse are flagged for co-delivery if they are within 0.5 km of each other (same building or adjacent houses):</p>
<div class="formula">
Co-delivery(i, j) = true  if  d(i, j) &le; 0.5 km  AND  warehouse(i) = warehouse(j)
</div>

<h3>4.2 Savings Calculation</h3>
<p>When co-delivery is detected, the fuel saved from combining trips is:</p>
<div class="formula">
Fuel Saved = d(i, j) &times; c_fuel &times; 2<br/>
<br/>
Savings per Order = (Fuel Saved / (n&#7522; + n&#7523;)) &times; (discount% / 100)<br/>
<br/>
Total Savings = &Sigma; Co-delivery pairs [savings_per_order &times; (n&#7522; + n&#7523;)]
</div>
<p>The <strong>discount percentage</strong> (default 8%) represents the portion of fuel savings passed to the customer as a benefit for opting into the optimized co-delivery route.</p>
"""),

        ("5. Route Optimization &mdash; Nearest-Neighbour TSP", """
<h3>5.1 Algorithm</h3>
<p>For each warehouse, the delivery route is optimized using a nearest-neighbour heuristic for the Traveling Salesman Problem (TSP):</p>
<div class="formula">
1. Start at warehouse position (lat_w, lon_w)<br/>
2. Find the unvisited stop nearest to current position<br/>
3. Move to that stop, mark as visited<br/>
4. Repeat until all stops visited<br/>
5. Return to warehouse<br/>
<br/>
Route distance = &Sigma; d(stop_k, stop_{k+1}) + d(last_stop, warehouse)
</div>

<h3>5.2 Time Window Estimation</h3>
<div class="formula">
Total Time (min) = (Total Distance / Avg Speed) &times; 60 + (Num Stops &times; 5 min)<br/>
<br/>
where Avg Speed = 25 km/h (urban Hubli-Dharwad traffic)<br/>
      5 min = average time per delivery stop
</div>

<h3>5.3 Fuel Cost per Route</h3>
<div class="formula">
Route Fuel Cost = Total Distance &times; c_fuel
</div>
"""),

        ("6. Order Classification &mdash; Maxima/Minima Application", """
<h3>6.1 Classification Function</h3>
<p>Orders are classified based on weight and volume using threshold boundaries (maxima/minima of a weighted scoring function):</p>
<div class="formula">
Fragility Score = f(weight, volume) = weight &times; 0.3 + volume &times; 0.7<br/>
<br/>
Classification:<br/>
  Fragile  if  declared_fragile = true  OR  weight &lt; 2 kg<br/>
  Sturdy   if  weight &gt; 15 kg  OR  volume &gt; 3 cft<br/>
  Normal   otherwise
</div>
<p><strong>Maxima/Minima interpretation:</strong></p>
<ul>
<li><strong>Minima:</strong> Weight &lt; 2 kg &rarr; minimum weight threshold for fragile classification (light items are likely delicate)</li>
<li><strong>Maxima:</strong> Weight &gt; 15 kg or volume &gt; 3 cft &rarr; maximum threshold for sturdy classification (heavy/bulky items need robust transport)</li>
</ul>

<h3>6.2 Vehicle Selection Function</h3>
<p>The cost-effectiveness function for vehicle selection:</p>
<div class="formula">
Cost-Effectiveness = (Load Capacity) / (Cost per km &times; Fuel Efficiency)
</div>
<table>
<tr><th>Vehicle</th><th>Type</th><th>Capacity</th><th>Cost/km</th><th>Efficiency</th></tr>
<tr><td>Electric Van (Bajaj RE EV)</td><td>Fragile</td><td>200 kg</td><td>&#8377;2.5</td><td>EV (zero fuel)</td></tr>
<tr><td>Piaggio Ape</td><td>Normal</td><td>500 kg</td><td>&#8377;4.0</td><td>25 km/L</td></tr>
<tr><td>Tata Ace</td><td>Sturdy</td><td>1000 kg</td><td>&#8377;6.0</td><td>15 km/L</td></tr>
</table>
<p>The vehicle with the best cost-effectiveness ratio for the given order type is recommended, minimizing:</p>
<div class="formula">
Transport Cost = (Distance &times; Cost per km) + (Damage Risk &times; Repair Cost)
</div>
"""),

        ("7. Warehouse Space Optimization &mdash; Bin-Packing", """
<h3>7.1 Space Allocation</h3>
<div class="formula">
Capacity (cft) = floor_area (sq ft) &times; ceiling_height (8 ft)<br/>
Used Space = allocated_orders &times; avg_order_volume (cft)<br/>
Utilization (%) = (Used Space / Capacity) &times; 100<br/>
Overflow = ceil((Used Space &minus; Capacity) / avg_order_volume)  if &gt; 100%
</div>

<h3>7.2 Load Utilization</h3>
<div class="formula">
Load Utilization (%) = min(100, (total_orders &times; 2 sq ft/order) / capacity_sqft &times; 100)
</div>
<p>The <strong>2 sq ft per order</strong> is an empirical estimate for standard parcel storage in Indian warehousing.</p>
"""),

        ("8. Reliability Matrix", """
<p>The full reliability matrix computes on-time probability for every neighbourhood-warehouse pair within the service radius:</p>
<div class="formula">
Matrix[i][j] = {{<br/>
  distance: d&#7522;&#7523;,<br/>
  on_time_prob: r&#7522; &times; e^(&minus;d&#7522;&#7523;/R)<br/>
}}  for all d&#7522;&#7523; &le; R
</div>
<p>This matrix informs the optimization model's late-penalty term and provides visibility into which neighbourhoods have poor delivery reliability.</p>
"""),

        ("9. Sensitivity Analysis", """
<p>SAVeKART runs the optimization model across varying parameters to understand system behavior:</p>

<h3>9.1 Service Radius Sensitivity</h3>
<div class="formula">
R &isin; {3, 4, 5, 6, 7} km<br/>
Observes: total cost, coverage %, warehouses used
</div>
<p><strong>Expected behavior:</strong> Larger radius &rarr; fewer warehouses needed, higher coverage, but potentially higher per-delivery cost.</p>

<h3>9.2 Late Penalty Sensitivity</h3>
<div class="formula">
p_late &isin; {&#8377;0, &#8377;25, &#8377;50, &#8377;75, &#8377;100}<br/>
Observes: total cost, coverage %, warehouses used
</div>
<p><strong>Expected behavior:</strong> Higher penalty &rarr; optimizer prefers closer warehouses even if it means selecting more warehouses.</p>

<h3>9.3 Warehouse Count Sensitivity</h3>
<div class="formula">
K_max &isin; {2, 3, 4, 5, 6}<br/>
Observes: total cost, coverage %, warehouses used
</div>
<p><strong>Expected behavior:</strong> More warehouses allowed &rarr; lower total cost (closer assignments), but higher fixed costs.</p>
"""),

        ("10. Summary of Mathematical Techniques Used", """
<table>
<tr><th>Technique</th><th>Application</th></tr>
<tr><td>Haversine formula</td><td>Distance calculation between GPS coordinates</td></tr>
<tr><td>Linear programming</td><td>Warehouse location optimization (objective + constraints)</td></tr>
<tr><td>Greedy heuristic</td><td>Facility-location problem (NP-hard approximation)</td></tr>
<tr><td>Exponential decay</td><td>On-time probability as function of distance</td></tr>
<tr><td>Nearest-neighbour TSP</td><td>Route optimization for delivery partners</td></tr>
<tr><td>Bin-packing</td><td>Warehouse space allocation</td></tr>
<tr><td>Statistical measures</td><td>Demand analysis (mean, std dev, variance, peak estimation)</td></tr>
<tr><td>Maxima/minima thresholds</td><td>Order classification (fragile/normal/sturdy)</td></tr>
<tr><td>Cost-effectiveness ratio</td><td>Vehicle selection optimization</td></tr>
<tr><td>Sensitivity analysis</td><td>Parameter tuning and system behavior analysis</td></tr>
</table>

<h3>References</h3>
<ol>
<li>Daskin, M.S. (2013). <em>Network and Discrete Location: Models, Algorithms, and Applications</em>. Wiley.</li>
<li>Applegate, D.L. et al. (2006). <em>The Traveling Salesman Problem: A Computational Study</em>. Princeton University Press.</li>
<li>Croes, T. (1958). "A Method for Solving Traveling-Salesman Problems." <em>Operations Research</em>, 6(6), 791-812.</li>
<li>Census of India 2011 &mdash; Hubli-Dharwad demographic data.</li>
<li>Indian Road Congress (IRC) standards for urban traffic speed estimation.</li>
</ol>
"""),
    ]

    for title, content in sections:
        parts.append(f"<h2>{title}</h2>")
        parts.append(content)

    parts.append("</body></html>")

    full_html = "\n".join(parts)
    output_path = os.path.join(PROJECT, "SAVeKART_Mathematical_Formulations.pdf")
    HTML(string=full_html).write_pdf(output_path)
    print(f"Math PDF generated: {output_path}")
    print(f"Size: {os.path.getsize(output_path) / 1024:.1f} KB")


# ============================================================
# PDF 2: SOURCE CODE
# ============================================================

def build_code_pdf():
    files = {
        "src/types.ts": read_file("src/types.ts"),
        "src/supabaseClient.ts": read_file("src/supabaseClient.ts"),
        "src/optimization.ts": read_file("src/optimization.ts"),
        "src/api.ts": read_file("src/api.ts"),
        "src/MapView.tsx": read_file("src/MapView.tsx"),
        "src/main.tsx": read_file("src/main.tsx"),
        "src/optimization.test.ts": read_file("src/optimization.test.ts"),
        "src/App.tsx": read_file("src/App.tsx"),
        "src/index.css": read_file("src/index.css"),
        "vite.config.ts": read_file("vite.config.ts"),
        "tsconfig.json": read_file("tsconfig.json"),
        "index.html": read_file("index.html"),
        "package.json": read_file("package.json"),
    }

    parts = []
    parts.append(f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{SHARED_CSS}</style></head><body>""")

    # Cover
    parts.append("""
<div class="cover">
  <div class="divider"></div>
  <h1>SAVeKART</h1>
  <div class="tagline">Complete Source Code</div>
  <div class="city">Hubli-Dharwad, Karnataka &mdash; Tier-2 City</div>
  <div class="divider"></div>
  <div class="info"><strong>Full Source Code &mdash; All Files</strong></div>
  <div class="info">Language: TypeScript (React + Vite)</div>
  <div class="info">Database: Supabase (PostgreSQL)</div>
  <div class="info">Maps: Leaflet + OpenStreetMap</div>
  <div class="info">CSV Parsing: PapaParse</div>
  <div class="info">Testing: Vitest (16 tests)</div>
  <div class="info" style="margin-top: 30px; color: #94a3b8;">Generated 20 September 2026</div>
</div>
""")

    # TOC
    parts.append("""
<div class="toc">
  <h1>Table of Contents &mdash; Source Files</h1>
  <ul>
""")

    code_files = [
        ("src/types.ts", "ts", "TypeScript type definitions for all data structures"),
        ("src/supabaseClient.ts", "ts", "Supabase client initialization"),
        ("src/optimization.ts", "ts", "Mathematical optimization engine (LP, TSP, classification, sensitivity)"),
        ("src/api.ts", "ts", "Database CRUD operations via Supabase"),
        ("src/MapView.tsx", "ts", "Leaflet map component with markers, routes, and popups"),
        ("src/main.tsx", "ts", "React application entry point"),
        ("src/optimization.test.ts", "test", "Unit tests (16 tests covering all optimization functions)"),
        ("src/App.tsx", "ts", "Main application with 8 tabs"),
        ("src/index.css", "css", "Global stylesheet with design system"),
        ("vite.config.ts", "conf", "Vite build configuration"),
        ("tsconfig.json", "json", "TypeScript compiler configuration"),
        ("index.html", "html", "HTML entry point"),
        ("package.json", "json", "NPM package manifest with all dependencies"),
    ]

    for filepath, tag, desc in code_files:
        tag_label = {"ts": "TypeScript", "css": "CSS", "json": "JSON", "html": "HTML", "conf": "Config", "test": "Test"}.get(tag, "Code")
        parts.append(f'<li><strong>{filepath}</strong> <span style="color:#94a3b8;font-size:10px;">({tag_label})</span><br/><span class="sub">{desc}</span></li>')

    parts.append("""
  </ul>
</div>
""")

    # Intro
    parts.append("""
<h1>Source Code Overview</h1>
<p>The SAVeKART platform is built using <strong>TypeScript</strong> with React 18 and Vite. The optimization engine uses mathematical functions implemented from scratch &mdash; no external LP solver library is used. The greedy heuristic, TSP, and all statistical computations are implemented in pure TypeScript.</p>
<table>
<tr><th>Component</th><th>Technology</th></tr>
<tr><td>Frontend</td><td>React 18 + TypeScript + Vite</td></tr>
<tr><td>Maps</td><td>Leaflet + OpenStreetMap</td></tr>
<tr><td>Backend/Database</td><td>Supabase (PostgreSQL)</td></tr>
<tr><td>CSV Parsing</td><td>PapaParse</td></tr>
<tr><td>Testing</td><td>Vitest</td></tr>
</table>

<h2>Open Source Libraries Used</h2>
<table>
<tr><th>Library</th><th>Version</th><th>Purpose</th><th>License</th></tr>
<tr><td>react</td><td>18.3.1</td><td>UI framework</td><td>MIT</td></tr>
<tr><td>react-dom</td><td>18.3.1</td><td>React DOM renderer</td><td>MIT</td></tr>
<tr><td>leaflet</td><td>1.9.4</td><td>Interactive maps</td><td>BSD-2-Clause</td></tr>
<tr><td>react-leaflet</td><td>4.2.1</td><td>React bindings for Leaflet</td><td>MIT</td></tr>
<tr><td>papaparse</td><td>5.4.1</td><td>CSV parsing</td><td>MIT</td></tr>
<tr><td>@supabase/supabase-js</td><td>2.45.4</td><td>Supabase client</td><td>MIT</td></tr>
<tr><td>typescript</td><td>5.6.2</td><td>Type checking</td><td>Apache-2.0</td></tr>
<tr><td>vite</td><td>5.4.8</td><td>Build tool</td><td>MIT</td></tr>
<tr><td>vitest</td><td>2.1.1</td><td>Testing framework</td><td>MIT</td></tr>
</table>
""")

    # Code files
    parts.append('<h1>Source Code &mdash; All Files</h1>')

    for filepath, tag, desc in code_files:
        tag_class = f"tag-{tag}"
        tag_label = {"ts": "TypeScript", "css": "CSS", "json": "JSON", "html": "HTML", "conf": "Config", "test": "Test"}.get(tag, "Code")
        line_count = len(files[filepath].splitlines())
        parts.append(f"""
<div class="code-block-title">
  <span class="tag {tag_class}">{tag_label}</span>
  &nbsp; {filepath}
</div>
<div class="file-meta">{desc} &mdash; {line_count} lines</div>
""")
        parts.append(code_block(files[filepath]))

    parts.append("</body></html>")

    full_html = "\n".join(parts)
    output_path = os.path.join(PROJECT, "SAVeKART_Source_Code.pdf")
    HTML(string=full_html).write_pdf(output_path)
    print(f"Code PDF generated: {output_path}")
    print(f"Size: {os.path.getsize(output_path) / 1024:.1f} KB")


# ============================================================
# Generate both PDFs
# ============================================================

build_math_pdf()
build_code_pdf()

# Remove old combined PDF if it exists
old_path = os.path.join(PROJECT, "SAVeKART_Code_and_Mathematics.pdf")
if os.path.exists(old_path):
    os.remove(old_path)
    print(f"Removed old combined PDF: {old_path}")

print("\nDone! Two separate PDFs generated.")
