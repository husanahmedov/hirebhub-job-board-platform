# MongoDB Aggregation Pipeline - Company Service Deep Dive

## Overview

This document explains the complex MongoDB aggregation pipelines used in the CompanyService. Aggregations are powerful tools for data transformation, filtering, and analysis.

---

## What is MongoDB Aggregation?

MongoDB aggregation is like a **data processing pipeline** where:

- Data flows through multiple **stages**
- Each stage transforms the data
- Final output is the processed result

Think of it like a factory assembly line: raw materials go in, each station does something, finished product comes out.

---

## Core Aggregation Structure

\`\`\`typescript
const pipeline: PipelineStage[] = [
{ $match: { ... } }, // Stage 1: Filter
{ $lookup: { ... } }, // Stage 2: Join
{ $addFields: { ... } }, // Stage 3: Add computed fields
{ $sort: { ... } }, // Stage 4: Sort
{ $facet: { ... } }, // Stage 5: Parallel pipelines
];

const result = await this.companyModel.aggregate(pipeline).exec();
\`\`\`

---

## Aggregation 1: Get Companies (getCompanies)

This is the most complex aggregation. Let me break it down stage by stage:

### Stage 1: $match (Filtering)

**Purpose:** Filter companies based on criteria
**Similar to:** SQL WHERE clause

\`\`\`typescript
{
$match: {
deletedAt: null, // Only active companies
verified: true, // Only verified
industry: { $in: ['IT', 'FINANCE'] }, // Multiple industries
'location.city': /san francisco/i, // Case-insensitive regex
recruiterIds: '507f1f77bcf86cd799439011' // Has specific recruiter
}
}
\`\`\`

**Why this works:**

- Runs early in pipeline = less data to process later
- Uses indexes for fast filtering
- $in operator for multiple values
- Regex for fuzzy matching

---

### Stage 2: $text (Full-Text Search)

**Purpose:** Search company names and descriptions
**Similar to:** SQL LIKE but much more powerful

\`\`\`typescript
{
$match: {
$text: {
$search: "software engineering startup", // Search phrase
$caseSensitive: false // Ignore case
}
}
},
{
$addFields: {
textScore: { $meta: 'textScore' } // Relevance score (0-1)
}
}
\`\`\`

**How it works:**

1. MongoDB uses text index (created in schema)
2. Searches both 'name' and 'description' fields
3. Assigns relevance score based on:
   - Field weights (name=10, description=5)
   - Term frequency
   - Word positions

**Example scores:**

- Company name contains "software" → Higher score
- Description mentions "engineering" → Lower score

---

### Stage 3: $lookup (Joins)

**Purpose:** Join with other collections to get related data
**Similar to:** SQL JOIN

#### Lookup 1: Job Count

\`\`\`typescript
{
$lookup: {
    from: 'jobs',                      // Collection to join
    let: { companyId: '$\_id' }, // Variables from current doc
pipeline: [ // Sub-pipeline on joined docs
{
$match: {
          $expr: {                     // Use expressions with variables
            $and: [
              { $eq: ['$companyId', '$$companyId'] },  // Match by ID
              { $eq: ['$deletedAt', null] } // Only active jobs
]
}
}
},
{ $count: 'count' } // Count matching docs
],
as: 'jobData' // Output array name
}
}
\`\`\`

**Step-by-step execution:**

1. For each company document
2. Look in 'jobs' collection
3. Find jobs where companyId matches
4. Filter out deleted jobs
5. Count how many remain
6. Store in 'jobData' array

**Result structure:**
\`\`\`javascript
{
\_id: '...',
name: 'Google',
jobData: [{ count: 42 }] // Array with count object
}
\`\`\`

#### Lookup 2: Review Statistics

\`\`\`typescript
{
$lookup: {
    from: 'companyreviews',
    let: { companyId: '$\_id' },
pipeline: [
{
$match: {
          $expr: { $eq: ['$companyId', '$$companyId'] }
        }
      },
      {
        $group: {                      // Group all reviews together
          _id: null,                   // No grouping key (single group)
          count: { $sum: 1 },          // Count all reviews
          avgRating: { $avg: '$rating' } // Average of rating field
}
}
],
as: 'reviewData'
}
}
\`\`\`

**$group operators explained:**

- `$sum: 1` → Add 1 for each document (counting)
- `$avg: '$rating'` → Average of rating field
- `_id: null` → Single group (all reviews together)

**Result:**
\`\`\`javascript
{
\_id: '...',
name: 'Google',
reviewData: [{
_id: null,
count: 156,
avgRating: 4.5
}]
}
\`\`\`

---

### Stage 4: $addFields (Computed Fields)

**Purpose:** Add new fields or transform existing ones
**Similar to:** SQL SELECT with calculated columns

\`\`\`typescript
{
$addFields: {
    jobCount: {
      $ifNull: [                           // Handle missing data
        { $arrayElemAt: ['$jobData.count', 0] }, // Get first element
0 // Default if missing
]
},
reviewCount: {
$ifNull: [
        { $arrayElemAt: ['$reviewData.count', 0] },
0
]
},
averageRating: {
$ifNull: [
        { $arrayElemAt: ['$reviewData.avgRating', 0] },
0
]
}
}
}
\`\`\`

**Operators explained:**

- `$arrayElemAt: [array, index]` → Get element at index (0 = first)
- `$ifNull: [value, default]` → Use default if value is null

**Why we need this:**

- Lookup returns arrays, we want single values
- Some companies might have no jobs/reviews
- Prevents null/undefined in GraphQL response

---

### Stage 5: $project (Remove Fields)

**Purpose:** Clean up temporary fields
**Similar to:** SQL SELECT (choosing columns)

\`\`\`typescript
{
$project: {
jobData: 0, // 0 = exclude, 1 = include
reviewData: 0,
textScore: 0 // Remove if not needed
}
}
\`\`\`

**Why remove fields:**

- Reduce response size
- Clean API response
- We already extracted the values we need

---

### Stage 6: $sort (Sorting)

**Purpose:** Order results
**Similar to:** SQL ORDER BY

\`\`\`typescript
{
$sort: {
averageRating: -1, // -1 = descending (highest first)
createdAt: -1 // Secondary sort (newest first)
}
}
\`\`\`

**Sort options:**

- `1` = ascending (A to Z, 0 to 9)
- `-1` = descending (Z to A, 9 to 0)

**Special case: Text search sorting**
\`\`\`typescript
if (hasTextSearch) {
{ $sort: { textScore: -1, createdAt: -1 } } // Sort by relevance first
}
\`\`\`

---

### Stage 7: $facet (Parallel Pipelines)

**Purpose:** Run multiple pipelines in parallel
**Similar to:** Running two SQL queries simultaneously

\`\`\`typescript
{
$facet: {
data: [ // Pipeline 1: Get paginated data
{ $skip: 0 }, // Skip first N documents
{ $limit: 10 } // Take next M documents
],
metadata: [ // Pipeline 2: Get total count
{ $count: 'totalCount' } // Count all documents
]
}
}
\`\`\`

**Why use $facet:**

1. **Performance:** Single database round-trip for both data + count
2. **Efficiency:** Aggregation runs once, splits at end
3. **Accuracy:** Count reflects same filters as data

**Without $facet (BAD):**
\`\`\`typescript
const companies = await pipeline1.exec(); // Query 1
const totalCount = await pipeline2.exec(); // Query 2 (redundant work!)
\`\`\`

**With $facet (GOOD):**
\`\`\`typescript
const result = await pipeline.exec(); // Single query!
const companies = result[0].data;
const totalCount = result[0].metadata[0].totalCount;
\`\`\`

**Result structure:**
\`\`\`javascript
[
{
data: [
{ _id: '1', name: 'Google', ... },
{ _id: '2', name: 'Facebook', ... },
// ... 10 companies
],
metadata: [
{ totalCount: 250 } // Total matching companies
]
}
]
\`\`\`

---

## Aggregation 2: Nearby Companies (getNearbyCompanies)

This uses geospatial queries for location-based search.

### Stage 1: $geoNear (Geospatial Search)

**Purpose:** Find documents near a geographic point
**Similar to:** SQL with spatial functions (PostGIS)

\`\`\`typescript
{
$geoNear: {
near: {
type: 'Point',
coordinates: [-122.4194, 37.7749] // [longitude, latitude]
},
distanceField: 'distance', // Output field with distance in meters
maxDistance: 50000, // 50km radius (in meters)
spherical: true, // Use spherical geometry (Earth is round!)
query: { // Additional filters
deletedAt: null,
'location.coordinates': { $exists: true }
}
}
}
\`\`\`

**How it works:**

1. MongoDB uses 2dsphere index
2. Calculates distance using spherical geometry
3. Sorts results by distance (nearest first)
4. Filters by maxDistance
5. Adds 'distance' field to each document

**Spherical vs Flat Geometry:**

- `spherical: true` → Accurate for Earth (accounts for curvature)
- `spherical: false` → Flat plane (only for small areas)

**Distance calculation:**
\`\`\`javascript
// Haversine formula (simplified)
distance = 2 _ R _ arcsin(sqrt(
sin²((lat2-lat1)/2) +
cos(lat1) _ cos(lat2) _ sin²((lon2-lon1)/2)
))
// R = Earth radius (6371 km)
\`\`\`

**Example output:**
\`\`\`javascript
{
\_id: '...',
name: 'Google',
location: { coordinates: [-122.0840, 37.4220] },
distance: 12543 // meters from search point
}
\`\`\`

### Converting Distance

\`\`\`typescript
{
$addFields: {
    distanceKm: { $divide: ['$distance', 1000] } // Meters to kilometers
}
}
\`\`\`

**Why convert:**

- Meters are too granular for UI
- Kilometers more user-friendly
- Keep original for sorting accuracy

---

## Aggregation 3: Company Statistics (getCompanyStats)

This uses advanced grouping for analytics.

### Single $facet with Multiple Groups

\`\`\`typescript
{
$facet: {
    overview: [
      {
        $group: {
          _id: null,                    // Single group (all companies)
          totalCompanies: { $sum: 1 },  // Count all
          verifiedCompanies: {
            $sum: { $cond: ['$verified', 1, 0] } // Conditional sum
}
}
}
],
byIndustry: [
{
$group: {
_id: '$industry', // Group by industry field
count: { $sum: 1 } // Count per industry
}
}
],
bySize: [
{
$group: {
_id: '$size',
count: { $sum: 1 }
}
}
],
byPlan: [
{
$group: {
_id: '$plan',
count: { $sum: 1 }
}
}
]
}
}
\`\`\`

**$cond operator (Conditional logic):**
\`\`\`typescript
{ $cond: [condition, trueValue, falseValue] }

// Example:
{ $cond: ['$verified', 1, 0] }
// If verified = true, add 1
// If verified = false, add 0
\`\`\`

**Result structure:**
\`\`\`javascript
[
{
overview: [
{ _id: null, totalCompanies: 1000, verifiedCompanies: 750 }
],
byIndustry: [
{ _id: 'IT', count: 450 },
{ _id: 'FINANCE', count: 200 },
{ _id: 'HEALTHCARE', count: 150 },
...
],
bySize: [
{ _id: 'SMALL', count: 300 },
{ _id: 'MEDIUM', count: 400 },
...
],
byPlan: [
{ _id: 'FREE', count: 600 },
{ _id: 'PRO', count: 300 },
...
]
}
]
\`\`\`

---

## Performance Optimization Tips

### 1. Index Usage

Aggregations use indexes when possible:

- `$match` stage uses indexes (if at start)
- `$sort` uses indexes (if after $match)
- Text search uses text index
- Geospatial uses 2dsphere index

**Check index usage:**
\`\`\`typescript
const explain = await this.companyModel.aggregate(pipeline).explain();
console.log(explain);
\`\`\`

### 2. Stage Order Matters

**Good (filter early):**
\`\`\`typescript
[
{ $match: { verified: true } }, // Reduce data early (uses index!)
{ $lookup: { ... } }, // Join less data
{ $sort: { ... } }
]
\`\`\`

**Bad (filter late):**
\`\`\`typescript
[
{ $lookup: { ... } }, // Join ALL data
{ $match: { verified: true } }, // Filter AFTER expensive join
{ $sort: { ... } }
]
\`\`\`

### 3. Limit Early

Use `$limit` early to reduce processing:
\`\`\`typescript
[
{ $match: { ... } },
{ $sort: { createdAt: -1 } },
{ $limit: 100 }, // Process only top 100
{ $lookup: { ... } } // Expensive join on less data
]
\`\`\`

### 4. Avoid Heavy Lookups

Each `$lookup` is expensive:

- Consider denormalization for frequently joined data
- Use lookups only when necessary
- Add limits to lookup sub-pipelines

### 5. Use $facet Wisely

`$facet` duplicates work before the split:

- Put $facet as late as possible
- Do expensive operations before facet (runs once)
- Do cheap operations in facet branches

---

## Common Aggregation Patterns

### Pattern 1: Count with Filters

\`\`\`typescript
[
{ $match: { status: 'active' } },
{ $count: 'total' }
]
\`\`\`

### Pattern 2: Group and Sum

\`\`\`typescript
[
{ $group: {
_id: '$category',
total: { $sum: '$amount' },
avg: { $avg: '$amount' },
min: { $min: '$amount' },
max: { $max: '$amount' }
}}
]
\`\`\`

### Pattern 3: Conditional Aggregation

\`\`\`typescript
[
{ $group: {
    _id: null,
    activeCount: {
      $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
},
totalRevenue: {
$sum: { $cond: ['$paid', '$amount', 0] }
}
}}
]
\`\`\`

### Pattern 4: Array Operations

\`\`\`typescript
[
{ $unwind: '$tags' }, // Flatten array
{ $group: {
_id: '$tags',
count: { $sum: 1 }
}},
{ $sort: { count: -1 } },
{ $limit: 10 } // Top 10 tags
]
\`\`\`

---

## Key Takeaways

1. **Pipeline = Assembly Line:** Data flows through stages, each transforming it
2. **Order Matters:** Filter early, join late for best performance
3. **$facet for Efficiency:** Get data + metadata in one query
4. **Indexes are Critical:** Create proper indexes for $match and $sort
5. **$lookup is Expensive:** Use sparingly, add limits to sub-pipelines
6. **Think in Stages:** Break complex queries into simple, sequential steps

---

## Additional Resources

- MongoDB Aggregation Docs: https://docs.mongodb.com/manual/aggregation/
- Aggregation Pipeline Quick Reference: https://docs.mongodb.com/manual/meta/aggregation-quick-reference/
- Aggregation Pipeline Optimization: https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/

---

**Questions? Check the aggregation stages in company.service.ts with this guide open!**
