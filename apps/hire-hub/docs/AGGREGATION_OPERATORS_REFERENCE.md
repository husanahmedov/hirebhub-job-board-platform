# MongoDB Aggregation Operators - Quick Reference

This is a quick reference for all aggregation operators used in the Company service.

---

## Pipeline Stages

### $match

**Purpose:** Filter documents (like SQL WHERE)
\`\`\`typescript
{ $match: { verified: true, deletedAt: null } }
\`\`\`

### $lookup

**Purpose:** Join with another collection (like SQL JOIN)
\`\`\`typescript
{
$lookup: {
from: 'jobs', // Collection to join
localField: '\_id', // Field from current collection
foreignField: 'companyId', // Field from jobs collection
as: 'jobs' // Output array name
}
}
\`\`\`

### $lookup with pipeline (Advanced)

\`\`\`typescript
{
$lookup: {
    from: 'jobs',
    let: { companyId: '$\_id' }, // Define variables
pipeline: [ // Sub-pipeline on joined docs
{ $match: { 
        $expr: { $eq: ['$companyId', '$$companyId'] }
}},
{ $count: 'count' }
],
as: 'jobData'
}
}
\`\`\`

### $addFields

**Purpose:** Add new fields or modify existing ones
\`\`\`typescript
{
$addFields: {
    fullName: { $concat: ['$firstName', ' ', '$lastName'] },
    jobCount: { $arrayElemAt: ['$jobData.count', 0] }
}
}
\`\`\`

### $project

**Purpose:** Include/exclude fields (like SQL SELECT)
\`\`\`typescript
{
$project: {
name: 1, // Include
email: 1, // Include
password: 0, // Exclude
tempData: 0 // Exclude
}
}
\`\`\`

### $sort

**Purpose:** Sort documents
\`\`\`typescript
{
$sort: {
createdAt: -1, // Descending (newest first)
name: 1 // Ascending (A-Z)
}
}
\`\`\`

### $skip

**Purpose:** Skip N documents (pagination)
\`\`\`typescript
{ $skip: 20 } // Skip first 20 documents
\`\`\`

### $limit

**Purpose:** Limit number of documents
\`\`\`typescript
{ $limit: 10 } // Take only 10 documents
\`\`\`

### $facet

**Purpose:** Run multiple pipelines in parallel
\`\`\`typescript
{
$facet: {
data: [
{ $skip: 0 },
{ $limit: 10 }
],
metadata: [
{ $count: 'total' }
]
}
}
\`\`\`

### $group

**Purpose:** Group documents and compute aggregates
\`\`\`typescript
{
$group: {
    _id: '$industry', // Group by field
count: { $sum: 1 },         // Count documents
    avgRating: { $avg: '$rating' },
totalRevenue: { $sum: '$revenue' }
}
}
\`\`\`

### $count

**Purpose:** Count documents
\`\`\`typescript
{ $count: 'totalCompanies' }
\`\`\`

### $unwind

**Purpose:** Deconstruct an array field
\`\`\`typescript
// Before: { \_id: 1, tags: ['a', 'b', 'c'] }
{ $unwind: '$tags' }
// After:
// { \_id: 1, tags: 'a' }
// { \_id: 1, tags: 'b' }
// { \_id: 1, tags: 'c' }
\`\`\`

### $geoNear

**Purpose:** Geospatial search (must be first stage)
\`\`\`typescript
{
$geoNear: {
near: { type: 'Point', coordinates: [-122.4, 37.7] },
distanceField: 'distance',
maxDistance: 50000,
spherical: true
}
}
\`\`\`

---

## Accumulator Operators (used in $group)

### $sum

\`\`\`typescript
{ $sum: 1 }                  // Count documents
{ $sum: '$amount' } // Sum a field
{ $sum: { $cond: [...] } } // Conditional sum
\`\`\`

### $avg

\`\`\`typescript
{ $avg: '$rating' } // Average of rating field
\`\`\`

### $min / $max

\`\`\`typescript
{ $min: '$price' } // Minimum value
{ $max: '$price' } // Maximum value
\`\`\`

### $first / $last

\`\`\`typescript
{ $first: '$createdAt' } // First value in group
{ $last: '$updatedAt' } // Last value in group
\`\`\`

### $push

\`\`\`typescript
{ $push: '$name' } // Collect into array
{ $push: { name: '$name', age: '$age' } } // Collect objects
\`\`\`

### $addToSet

\`\`\`typescript
{ $addToSet: '$category' } // Collect unique values
\`\`\`

---

## Expression Operators

### $cond (If-Then-Else)

\`\`\`typescript
{
$cond: [
    { $eq: ['$status', 'active'] }, // Condition
1, // If true
0 // If false
]
}

// Shorthand:
{ $cond: ['$verified', 1, 0] }
\`\`\`

### $ifNull (Default Value)

\`\`\`typescript
{ $ifNull: ['$nickname', '$firstName'] }  // Use nickname, fallback to firstName
{ $ifNull: [{ $arrayElemAt: ['$data', 0] }, 0] } // Default to 0 if null
\`\`\`

### $eq / $ne (Equal / Not Equal)

\`\`\`typescript
{ $eq: ['$status', 'active'] } // Equal
{ $ne: ['$deletedAt', null] } // Not equal
\`\`\`

### $gt / $gte / $lt / $lte (Comparisons)

\`\`\`typescript
{ $gt: ['$age', 18] } // Greater than
{ $gte: ['$age', 18] } // Greater than or equal
{ $lt: ['$age', 65] } // Less than
{ $lte: ['$age', 65] } // Less than or equal
\`\`\`

### $and / $or / $not (Logical)

\`\`\`typescript
{
$and: [
    { $eq: ['$status', 'active'] },
{ $gte: ['$age', 18] }
]
}

{
$or: [
    { $eq: ['$role', 'admin'] },
{ $eq: ['$role', 'moderator'] }
]
}

{ $not: ['$deleted'] }
\`\`\`

### $in (In Array)

\`\`\`typescript
{ $in: ['$status', ['active', 'pending']] }
\`\`\`

---

## Array Operators

### $arrayElemAt

\`\`\`typescript
{ $arrayElemAt: ['$tags', 0] } // First element
{ $arrayElemAt: ['$tags', -1] } // Last element
\`\`\`

### $size

\`\`\`typescript
{ $size: '$items' } // Number of elements in array
\`\`\`

### $filter

\`\`\`typescript
{
$filter: {
    input: '$items',
as: 'item',
cond: { $gte: ['$$item.price', 100] }
}
}
\`\`\`

### $map

\`\`\`typescript
{
$map: {
    input: '$items',
as: 'item',
in: '$$item.name'
}
}
\`\`\`

### $reduce

\`\`\`typescript
{
$reduce: {
    input: '$items',
initialValue: 0,
in: { $add: ['$$value', '$$this.price'] }
}
}
\`\`\`

---

## String Operators

### $concat

\`\`\`typescript
{ $concat: ['$firstName', ' ', '$lastName'] }
\`\`\`

### $toLower / $toUpper

\`\`\`typescript
{ $toLower: '$email' }
{ $toUpper: '$status' }
\`\`\`

### $substr

\`\`\`typescript
{ $substr: ['$description', 0, 100] } // First 100 chars
\`\`\`

### $split

\`\`\`typescript
{ $split: ['$fullName', ' '] } // Returns array
\`\`\`

---

## Math Operators

### $add / $subtract / $multiply / $divide

\`\`\`typescript
{ $add: ['$price', '$tax'] }
{ $subtract: ['$total', '$discount'] }
{ $multiply: ['$price', '$quantity'] }
{ $divide: ['$distance', 1000] } // Meters to kilometers
\`\`\`

### $mod

\`\`\`typescript
{ $mod: ['$value', 10] } // Modulo (remainder)
\`\`\`

### $pow / $sqrt

\`\`\`typescript
{ $pow: ['$base', 2] } // Square
{ $sqrt: '$area' } // Square root
\`\`\`

### $ceil / $floor / $round

\`\`\`typescript
{ $ceil: '$price' } // Round up
{ $floor: '$price' } // Round down
{ $round: ['$price', 2] } // Round to 2 decimals
\`\`\`

---

## Date Operators

### $year / $month / $dayOfMonth

\`\`\`typescript
{ $year: '$createdAt' }
{ $month: '$createdAt' }
{ $dayOfMonth: '$createdAt' }
\`\`\`

### $dateToString

\`\`\`typescript
{
$dateToString: {
    format: '%Y-%m-%d',
    date: '$createdAt'
}
}
\`\`\`

### $dateDiff

\`\`\`typescript
{
$dateDiff: {
    startDate: '$startDate',
endDate: '$endDate',
unit: 'day'
}
}
\`\`\`

---

## Type Operators

### $type

\`\`\`typescript
{ $type: '$field' } // Returns BSON type
\`\`\`

### $convert

\`\`\`typescript
{
$convert: {
    input: '$stringNumber',
to: 'int'
}
}
\`\`\`

### $toString / $toInt / $toDouble / $toDate

\`\`\`typescript
{ $toString: '$numericId' }
{ $toInt: '$stringAge' }
{ $toDouble: '$price' }
{ $toDate: '$timestamp' }
\`\`\`

---

## Meta Operators

### $meta (Text Search Score)

\`\`\`typescript
{
$addFields: {
score: { $meta: 'textScore' }
}
}
\`\`\`

---

## Expression Variables

### $expr (Use expressions in $match)

\`\`\`typescript
{
$match: {
    $expr: {
      $gt: ['$totalPrice', '$budget']
}
}
}
\`\`\`

### $$ (Reference variables)

\`\`\`typescript
// In $lookup with let:
let: { companyId: '$\_id' }
// Use with $$:
$match: { $expr: { $eq: ['$companyId', '$$companyId'] } }
\`\`\`

---

## Common Patterns

### Count with condition

\`\`\`typescript
{
$sum: { $cond: ['$active', 1, 0] }
}
\`\`\`

### Percentage calculation

\`\`\`typescript
{
$multiply: [
    { $divide: ['$partial', '$total'] },
100
]
}
\`\`\`

### Nested field access

\`\`\`typescript
'$user.profile.name'
'$location.coordinates'
\`\`\`

### Check if field exists

\`\`\`typescript
{ $match: { 'location.coordinates': { $exists: true } } }
\`\`\`

### Check if array is empty

\`\`\`typescript
{
$cond: {
    if: { $gt: [{ $size: '$items' }, 0] },
then: '$items',
else: []
}
}
\`\`\`

---

## Performance Tips

1. **$match early** - Filter as early as possible
2. **$project before $unwind** - Reduce field size
3. **Use indexes** - $match and $sort benefit from indexes
4. **Limit sub-pipelines** - Add $limit in $lookup pipelines
5. **$facet for parallel work** - Get data + metadata in one query
6. **Avoid $lookup when possible** - Consider denormalization

---

## Debugging

### Explain aggregation

\`\`\`typescript
const explain = await collection.aggregate(pipeline).explain();
console.log(JSON.stringify(explain, null, 2));
\`\`\`

### Add intermediate $out for debugging

\`\`\`typescript
[
{ $match: { ... } },
{ $out: 'debug_step1' }, // Save intermediate result
{ $lookup: { ... } }
]
\`\`\`

### Use $project to see intermediate results

\`\`\`typescript
[
{ $addFields: { debug: '$someCalculation' } },
{ $project: { debug: 1 } } // See only debug field
]
\`\`\`

---

**Bookmark this for quick reference when writing aggregations!**
