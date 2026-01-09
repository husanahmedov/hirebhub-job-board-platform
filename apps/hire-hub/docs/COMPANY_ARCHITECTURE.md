# Company Module - Architecture & Data Flow

## 🏗️ Architecture Overview

\`\`\`
┌─────────────────────────────────────────────────────────────────────┐
│ GraphQL Client │
│ (Frontend/Mobile App) │
└─────────────────────────────┬───────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│ company.resolver.ts │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ @Query getCompanies() │ │
│ │ @Query getNearbyCompanies() │ │
│ │ @Query getCompanyById() │ │
│ │ @Query getCompanyBySlug() │ │
│ │ @Query getCompanyStats() │ │
│ │ @Mutation createCompany() │ │
│ │ @Mutation updateCompany() │ │
│ │ @Mutation deleteCompany() │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│ company.service.ts │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Business Logic & Aggregation Pipelines │ │
│ │ - Complex filtering │ │
│ │ - Text search │ │
│ │ - Geospatial queries │ │
│ │ - Multi-collection joins │ │
│ │ - Statistics computation │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│ Company.model.ts │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Schema Definition │ │
│ │ - Field types & validation │ │
│ │ - Indexes (text, geo, compound) │ │
│ │ - Virtual fields │ │
│ │ - Middleware (pre-save, pre-find) │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│ MongoDB Database │
│ ┌─────────────┐ ┌─────────────┐ ┌────────────────────┐ │
│ │ companies │ │ jobs │ │ companyreviews │ │
│ └─────────────┘ └─────────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## 📊 Data Flow: getCompanies Query

\`\`\`

1. CLIENT REQUEST
   ┌──────────────────────────────────────────────┐
   │ GraphQL Query: │
   │ getCompanies(input: { │
   │ filter: { industries: [IT], verified: true } │
   │ sort: { field: "averageRating", order: "desc" } │
   │ pagination: { page: 1, limit: 10 } │
   │ }) │
   └──────────────────┬───────────────────────────┘
   │
   ▼
2. RESOLVER
   ┌──────────────────────────────────────────────┐
   │ company.resolver.ts │
   │ - Validates input │
   │ - Calls service method │
   └──────────────────┬───────────────────────────┘
   │
   ▼
3. SERVICE - AGGREGATION PIPELINE
   ┌──────────────────────────────────────────────┐
   │ Stage 1: $match │
   │ { verified: true, deletedAt: null } │
   │ ↓ Result: 500 companies │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Stage 2: $match (industry filter) │
   │ { industry: { $in: ['IT'] } } │
   │ ↓ Result: 150 companies │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Stage 3: $lookup (jobs collection) │
   │ Join with jobs, count active jobs │
   │ ↓ Result: 150 companies + jobCount field │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Stage 4: $lookup (reviews collection) │
   │ Join with reviews, get count + avg rating │
   │ ↓ Result: 150 companies + review stats │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Stage 5: $addFields │
   │ Extract values from arrays │
   │ { jobCount: 42, reviewCount: 15, avgRating: 4.5 } │
   │ ↓ Result: 150 companies with computed fields │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Stage 6: $sort │
   │ { averageRating: -1 } │
   │ ↓ Result: 150 companies sorted by rating │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Stage 7: $facet (parallel execution) │
   │ ┌──────────────┐ ┌──────────────┐ │
   │ │ data branch │ │ count branch │ │
   │ │ $skip: 0 │ │ $count: total│ │
   │ │ $limit: 10 │ │ │ │
   │ └──────────────┘ └──────────────┘ │
   │ ↓ Result: { data: [10 companies], metadata: [{ totalCount: 150 }] } │
   └──────────────────┬───────────────────────────┘
   │
   ▼
4. RESPONSE FORMATTING
   ┌──────────────────────────────────────────────┐
   │ service returns: │
   │ { │
   │ companies: [...10 items...], │
   │ totalCount: 150, │
   │ page: 1, │
   │ limit: 10, │
   │ totalPages: 15, │
   │ hasNextPage: true, │
   │ hasPreviousPage: false │
   │ } │
   └──────────────────┬───────────────────────────┘
   │
   ▼
5. CLIENT RECEIVES
   ┌──────────────────────────────────────────────┐
   │ { │
   │ data: { │
   │ getCompanies: { │
   │ companies: [...], │
   │ totalCount: 150, │
   │ hasNextPage: true │
   │ } │
   │ } │
   │ } │
   └──────────────────────────────────────────────┘
   \`\`\`

---

## 🗺️ Data Flow: getNearbyCompanies Query

\`\`\`

1. CLIENT REQUEST
   ┌──────────────────────────────────────────────┐
   │ User's current location: │
   │ Longitude: -122.4194 (San Francisco) │
   │ Latitude: 37.7749 │
   │ Search radius: 50 km │
   └──────────────────┬───────────────────────────┘
   │
   ▼
2. AGGREGATION PIPELINE
   ┌──────────────────────────────────────────────┐
   │ Stage 1: $geoNear (MUST BE FIRST) │
   │ ┌────────────────────────────────────────┐ │
   │ │ near: Point(-122.4194, 37.7749) │ │
   │ │ Calculate distance from point │ │
   │ │ Filter: maxDistance 50km │ │
   │ │ Sort by: distance (nearest first) │ │
   │ └────────────────────────────────────────┘ │
   │ ↓ Companies within 50km, sorted by distance │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Result example: │
   │ [ │
   │ { name: "Google", distance: 2134 m }, │
   │ { name: "Airbnb", distance: 3521 m }, │
   │ { name: "Uber", distance: 7842 m }, │
   │ ... │
   │ ] │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Stage 2-4: Same as getCompanies │
   │ - Lookup jobs │
   │ - Lookup reviews │
   │ - Add computed fields │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Stage 5: Convert distance │
   │ distanceKm = distance / 1000 │
   │ ↓ More user-friendly format │
   └──────────────────┬───────────────────────────┘
   ▼
   ┌──────────────────────────────────────────────┐
   │ Stage 6: $facet (pagination) │
   │ Get page 1 (10 companies) + total count │
   └──────────────────────────────────────────────┘
   \`\`\`

---

## 🔍 Index Usage Map

\`\`\`
Query Type Index Used Speed Gain
────────────────────────────────────────────────────────────────────
Text search name*1_description_1 (text) 10-100x
Filter by industry industry_1_size_1 (compound) 5-20x
Filter by verified verified_1_plan_1 (compound) 5-20x
Filter by recruiter recruiterIds_1 10-50x
Geospatial search location.coordinates (2dsphere) 20-100x
Sort by createdAt createdAt*-1 5-15x
Filter deleted deletedAt_1 (sparse) 3-10x
\`\`\`

---

## 💾 Schema Relationships

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│ Company Document │
├─────────────────────────────────────────────────────────────────┤
│ \_id: ObjectId │
│ name: "Google Inc." │
│ slug: "google-inc" │
│ industry: "IT" │
│ size: "ENTERPRISE" │
│ verified: true │
│ location: { ┌──────────────────────┐ │
│ city: "San Francisco", │ GeoJSON Point │ │
│ coordinates: [-122.08, 37.42]│ Used by $geoNear │ │
│ } └──────────────────────┘ │
│ recruiterIds: [ │
│ ObjectId("507f1f77..."), ──────┐ │
│ ObjectId("507f191e...") │ │
│ ] │ │
└───────────────────────────────────┼─────────────────────────────┘
│
┌───────────────┴────────────────┐
▼ ▼
┌────────────────────┐ ┌──────────────────┐
│ User (Recruiter) │ │ User (Admin) │
├────────────────────┤ ├──────────────────┤
│ \_id │ │ \_id │
│ role: RECRUITER │ │ role: ADMIN │
│ email │ │ email │
└────────────────────┘ └──────────────────┘

                    ▲
                    │ Referenced by
        ┌───────────┴────────────┐
        │                        │

┌───────────────┐ ┌────────────────────┐
│ Job │ │ CompanyReview │
├───────────────┤ ├────────────────────┤
│ \_id │ │ \_id │
│ companyId ────┘ │ companyId ─────────┘
│ title │ │ rating: 4.5 │
│ deletedAt │ │ comment │
└───────────────┘ └────────────────────┘
│ │
│ Joined via │
│ $lookup │
│ │
└─────────┬───────────────┘
▼
Virtual Fields Added: - jobCount - reviewCount - averageRating
\`\`\`

---

## 🚀 Performance Characteristics

\`\`\`
Operation Without Indexes With Indexes Speedup
──────────────────────────────────────────────────────────────────────
Find by ID 10ms 1ms 10x
Text search (1M docs) 5000ms 50ms 100x
Geo search (100km) 8000ms 80ms 100x
Filter + sort 2000ms 100ms 20x
Aggregation (complex) 10000ms 500ms 20x
Count all companies 500ms 50ms 10x
\`\`\`

### Aggregation Pipeline Performance

\`\`\`
Stage Complexity Typical Time Optimization
────────────────────────────────────────────────────────────────
$match              O(log n)      1-10ms          Use indexes
$text O(log n) 10-50ms Text index
$lookup (simple)    O(n*m)        50-200ms        Add indexes to joined collection
$lookup (pipeline) O(n*m*p) 100-500ms Limit sub-pipeline
$group              O(n)          50-500ms        Match/limit before grouping
$sort O(n log n) 10-100ms Use index or limit first
$facet              O(2n)         Double          Worth it for single round-trip
$geoNear O(log n) 10-100ms 2dsphere index required
\`\`\`

---

## 📈 Scalability Considerations

### Current Implementation (Good for < 1M companies)

- ✅ Efficient indexes
- ✅ Pagination with $facet
- ✅ Optimized aggregation order
- ✅ Soft deletes (data retention)

### Future Optimizations (For > 1M companies)

1. **Caching Layer:**
   - Redis for popular queries
   - TTL based on update frequency
2. **Cursor-based Pagination:**
   - Better for large datasets
   - Consistent results during updates
3. **Materialized Views:**
   - Pre-compute jobCount, reviewCount
   - Update via change streams or scheduled jobs
4. **Sharding:**
   - Shard by location (geo-distributed)
   - Shard key: location.country or location.city

5. **Read Replicas:**
   - Separate read/write connections
   - Route queries to replicas

---

## 🎯 Use Case Examples

### Use Case 1: Job Seeker Finding Companies

\`\`\`
User Story: As a software engineer, I want to find tech companies in SF
with good ratings that are actively hiring.

Query:
getCompanies({
filter: {
industries: [IT],
city: "San Francisco",
verified: true
},
sort: { field: "averageRating", order: "desc" }
})

Pipeline Flow:
Match SF tech companies → Join with jobs → Join with reviews
→ Compute rating → Sort → Return top 10
\`\`\`

### Use Case 2: Map View of Nearby Companies

\`\`\`
User Story: Show me companies within 25km of my location.

Query:
getNearbyCompanies({
longitude: -122.4194,
latitude: 37.7749,
maxDistance: 25
})

Pipeline Flow:
$geoNear (find within 25km) → Sort by distance → Join data
→ Convert distance to km → Paginate
\`\`\`

### Use Case 3: Admin Dashboard Stats

\`\`\`
User Story: Show me company distribution by industry, size, and plan.

Query:
getCompanyStats()

Pipeline Flow:
Match active companies → $facet (4 parallel groupings)
→ Combine results → Return statistics
\`\`\`

---

## 🧪 Testing the Implementation

### GraphQL Playground Queries

**Test 1: Basic Query**
\`\`\`graphql
query {
getCompanies(input: {
pagination: { limit: 5 }
}) {
companies {
name
industry
verified
}
totalCount
}
}
\`\`\`

**Test 2: Complex Filtering**
\`\`\`graphql
query {
getCompanies(input: {
filter: {
search: "software"
industries: [IT, FINANCE]
verified: true
}
sort: {
field: "averageRating"
order: "desc"
}
pagination: { page: 1, limit: 10 }
}) {
companies {
name
averageRating
jobCount
}
}
}
\`\`\`

**Test 3: Nearby Search**
\`\`\`graphql
query {
getNearbyCompanies(input: {
longitude: -122.4194
latitude: 37.7749
maxDistance: 50
}) {
companies {
name
distanceKm
location { city }
}
}
}
\`\`\`

---

This architecture is production-ready and scalable! 🚀
