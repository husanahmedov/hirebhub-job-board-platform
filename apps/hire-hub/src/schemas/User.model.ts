import { Schema } from 'mongoose';
import { UserStatus, UserRole, EmploymentType, WorkPreference } from '../libs/enums';

/**
 * User Schema - MongoDB schema definition for user documents
 *
 * This schema defines the complete user data structure including authentication,
 * profile information, settings, and OAuth integrations for the HireHub platform.
 *
 * @collection users
 * @indexes
 * - email: Unique index for fast email lookups and authentication
 * - role + status: Compound index for filtering users by role and status
 * - skills: Text index for skill-based search
 * - location: 2dsphere index for geospatial queries
 * - oauthProviders: Compound index for OAuth provider lookups
 * - deletedAt: Sparse index for soft-deleted users
 *
 * @performance
 * - Automatic timestamps (createdAt, updatedAt)
 * - Optimized indexes for common queries
 * - Geospatial support for location-based searches
 */
const UserSchema = new Schema(
	{
		/**
		 * Email address - Used for authentication and communication
		 * @unique Must be unique across all users
		 * @required
		 * @indexed Automatically indexed via unique constraint
		 */
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			maxlength: 255,
		},

		/**
		 * Email verification status
		 * @default false
		 */
		emailVerified: {
			type: Boolean,
			default: false,
			index: true, // Index for filtering verified users
		},

		/**
		 * Hashed password - Never store plain text passwords
		 * @optional OAuth users may not have passwords
		 * @select false to exclude from queries by default
		 */
		passwordHash: {
			type: String,
			required: false,
			select: false, // Don't return in queries unless explicitly requested
		},

		/**
		 * Refresh token - Used for obtaining new access tokens
		 * @optional Only present for authenticated users with refresh token support
		 * @select false to exclude from queries by default
		 */
		refreshToken: {
			type: String,
			required: false,
			select: false, // Don't return in queries unless explicitly requested
		},

		/**
		 * User's first name
		 * @required
		 */
		firstName: {
			type: String,
			required: false,
			trim: true,
			maxlength: 50,
		},

		/**
		 * User's last name
		 * @required
		 */
		lastName: {
			type: String,
			required: false,
			trim: true,
			maxlength: 50,
		},

		/**
		 * User role - Determines permissions and access levels
		 * @enum {UserRole} ADMIN, RECRUITER, CANDIDATE
		 * @default UserRole.CANDIDATE
		 * @indexed Part of compound index with status
		 */
		role: {
			type: String,
			enum: Object.values(UserRole),
			required: true,
			index: true,
		},

		/**
		 * Account status - Controls account accessibility
		 * @enum {UserStatus} ACTIVE, DEACTIVATED, SUSPENDED
		 * @default UserStatus.ACTIVE
		 * @indexed Part of compound index with role
		 */
		status: {
			type: String,
			enum: Object.values(UserStatus),
			default: UserStatus.ACTIVE,
			index: true,
		},

		/**
		 * User profile information - Extended user data
		 */
		profile: {
			/**
			 * Professional headline or tagline
			 * exmple: "Full Stack Developer at TechCorp"
			 * @maxlength 200
			 */
			headline: {
				type: String,
				trim: true,
				maxlength: 200,
			},

			/**
			 * User biography or about section
			 * Detailed description about the user
			 * @maxlength 2000
			 */
			bio: {
				type: String,
				trim: true,
				maxlength: 2000,
			},

			contactInfo: {
				phone_number: { type: String, trim: true, maxlength: 20 },
				email: { type: String, trim: true, maxlength: 255 },
			},

			openTo: {
				work: { type: Boolean, default: false },
				hiring: { type: Boolean, default: false },
				freelance: { type: Boolean, default: false },
				mentorship: { type: Boolean, default: false },
			},

			/**
			 * Geographic location information
			 * example: { city: "San Francisco", region: "CA", country: "USA" }
			 */
			location: {
				/**
				 * City name
				 */
				city: {
					type: String,
					trim: true,
					maxlength: 100,
				},

				/**
				 * State/region name
				 */
				region: {
					type: String,
					trim: true,
					maxlength: 100,
				},

				/**
				 * Country name
				 */
				country: {
					type: String,
					trim: true,
					maxlength: 100,
				},

				/**
				 * Geospatial coordinates for location-based searches
				 * @type Point GeoJSON Point object
				 * @indexed 2dsphere index for geospatial queries
				 * example: { type: "Point", coordinates: [-122.4194, 37.7749] }
				 */
				geo: {
					type: {
						type: String,
						enum: ['Point'],
						default: 'Point',
					},
					coordinates: {
						type: [Number], // [longitude, latitude]
						default: [0, 0],
					},
				},
			},

			/**
			 * User's skills and competencies
			 * @indexed Text index for skill-based search
			 * @example ["JavaScript", "Node.js", "GraphQL"]
			 */
			skills: [
				{
					type: String,
					trim: true,
					maxlength: 50,
					required: true,
				},
			],

			/**
			 * Educational background entries
			 * @example
			 * [
			 *   {
			 *     school: "University of Tech",
			 *     degree: "B.Sc. Computer Science",
			 *     fieldOfStudy: "Software Engineering",
			 *     startYear: "2015-08-01",
			 *     endYear: "2019-05-15"
			 *   }
			 * ]
			 */
			education: [
				{
					/**
					 * Name of educational institution
					 */
					school: {
						type: String,
						trim: true,
						maxlength: 200,
					},

					/**
					 * Degree or certification obtained
					 */
					degree: {
						type: String,
						trim: true,
						maxlength: 100,
					},

					/**
					 * Field or major of study
					 */
					fieldOfStudy: {
						type: String,
						trim: true,
						maxlength: 100,
					},

					/**
					 * Start date of education
					 */
					startYear: {
						type: Number,
					},

					/**
					 * End date of education (null if ongoing)
					 */
					endYear: {
						type: Number,
					},
				},
			],

			/**
			 * Work experience entries
			 * @example
			 * [
			 *   {
			 *     company: "TechCorp",
			 *     title: "Software Engineer",
			 *     location: "San Francisco, CA",
			 *     startDate: "2020-06-01",
			 *     endDate: null,
			 *     description: "Working on full stack development..."
			 *   }
			 * ]
			 */
			experience: [
				{
					/**
					 * Company or organization name
					 */
					company: {
						type: String,
						trim: true,
						maxlength: 200,
					},

					/**
					 * Job title or position
					 */
					title: {
						type: String,
						trim: true,
						maxlength: 100,
					},

					employmentType: {
						type: String,
						enum: Object.values(EmploymentType),
						maxlength: 50,
					},

					currentlyWorkingHere: {
						type: Boolean,
						default: false,
					},

					/**
					 * Work location
					 */
					location: {
						type: String,
						trim: true,
						maxlength: 200,
					},

					locationType: {
						type: String,
						enum: Object.values(WorkPreference),
						trim: true,
						maxlength: 50,
					},

					skills: [
						{
							type: String,
							trim: true,
							maxlength: 50,
						},
					],
					media: [
						{
							type: String,
							trim: true,
							maxlength: 500,
						},
					],

					/**
					 * Employment start date
					 */
					startDate: {
						type: Number,
					},

					/**
					 * Employment end date (null if current)
					 */
					endDate: {
						type: Number,
					},

					/**
					 * Job description or responsibilities
					 */
					description: {
						type: String,
						trim: true,
						maxlength: 1000,
					},
				},
			],

			socialLinks: [
				{
					type: String,
					trim: true,
					maxlength: 40,
				},
			],
			/**
			 * Reference to uploaded resume document
			 */
			resumeId: {
				type: String,
				trim: true,
			},

			/**
			 * Profile avatar/photo URL
			 */
			avatarUrl: {
				type: String,
				trim: true,
				maxlength: 500,
			},

			/**
			 * Profile banner/cover image URL
			 */
			bannerUrl: {
				type: String,
				trim: true,
				maxlength: 500,
			},
		},

		/**
		 * Email verification code
		 * @optional Only present when email verification is pending
		 * @select false to exclude from queries by default
		 */
		verificationCode: {
			type: String,
			required: false,
			select: false,
		},

		/**
		 * Verification code expiration time
		 * @optional Only present when verification code is set
		 */
		verificationCodeExpires: {
			type: Date,
			required: false,
			select: false,
		},

		/**
		 * OAuth/Social authentication providers
		 * @indexed Compound index on provider + providerId for OAuth lookups
		 * @example [{ provider: "google", providerId: "1234567890", profileUrl: "https://profiles.google.com/user" }]
		 */
		oauthProviders: [
			{
				/**
				 * OAuth provider name (google, linkedin, github, etc.)
				 */
				provider: {
					type: String,
					trim: true,
					maxlength: 50,
				},

				/**
				 * User ID from the OAuth provider
				 */
				providerId: {
					type: String,
					trim: true,
					maxlength: 255,
				},

				/**
				 * URL to user's profile on the OAuth provider
				 */
				profileUrl: {
					type: String,
					trim: true,
					maxlength: 500,
				},
			},
		],

		/**
		 * Active company ID for recruiters
		 * Tracks which company the recruiter is currently working with
		 * @optional Only relevant for RECRUITER role
		 * @ref Company
		 */
		activeCompanyId: {
			type: Schema.Types.ObjectId,
			ref: 'Company',
			required: false,
			index: true,
		},

		publicProfileUsername: {
			type: String,
			trim: true,
			maxlength: 500,
		},

		/**
		 * User preferences and settings
		 */
		settings: {
			/**
			 * Preferred language code (ISO 639-1)
			 * @default 'en'
			 */
			language: {
				type: String,
				default: 'en',
				maxlength: 5,
			},

			/**
			 * Preferred timezone (IANA timezone identifier)
			 * @default 'UTC'
			 */
			timezone: {
				type: String,
				default: 'UTC',
				maxlength: 50,
			},

			/**
			 * Notification preferences
			 * @example { email: true, push: false }
			 */
			notifications: {
				/**
				 * Email notification enabled
				 * @default true
				 */
				email: {
					type: Boolean,
					default: true,
				},

				/**
				 * Push notification enabled
				 * @default false
				 */
				push: {
					type: Boolean,
					default: false,
				},
			},
		},

		/**
		 * Soft delete timestamp
		 * @default null
		 * @indexed Sparse index for efficient queries on active users
		 */
		deletedAt: {
			type: Date,
			default: null,
		},

		/**
		 * Flag indicating if the user has completed registration
		 * @default false
		 */
		hasCompleteRegistration: {
			type: Boolean,
			default: false,
		},

		/**
		 * User qualifications
		 * @type [QualificationSchema]
		 * @default []
		 */
		qualifications: {
			type: [Object],
			default: [],
		},

		/**
		 * User publications
		 * @type [PublicationSchema]
		 * @default []
		 */
		publications: {
			type: [Object],
			default: [],
		},

		viewsCount: {
			type: Number,
			default: 0,
		},
	},
	{
		// Automatic timestamp management
		timestamps: true,

		// Collection name
		collection: 'users',

		// Optimize document storage
		minimize: false,

		// Enable strict mode for schema validation
		strict: true,

		// Virtuals in JSON
		toJSON: {
			virtuals: true,
			transform: function (doc, ret) {
				// Remove sensitive fields from JSON output
				delete (ret as any).passwordHash;
				delete (ret as any).__v;
				return ret;
			},
		},

		toObject: {
			virtuals: true,
		},
	},
);

// ============================================================================
// INDEXES - Performance optimization for common queries
// ============================================================================

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ publicProfileUsername: 1 }, { unique: true, sparse: true });

/**
 * Compound index for filtering users by role and status
 * Optimizes queries like: find({ role: 'CANDIDATE', status: 'ACTIVE' })
 */
UserSchema.index({ role: 1, status: 1 });

/**
 * Compound index for email verification status with role
 * Optimizes queries for verified users of specific roles
 */
UserSchema.index({ emailVerified: 1, role: 1 });

/**
 * Text index for full-text search on names
 * Enables searching users by first name or last name
 */
UserSchema.index({ firstName: 'text', lastName: 'text' });

/**
 * Text index for skill-based search
 * Enables searching users by their skills
 */
UserSchema.index({ 'profile.skills': 1 });

/**
 * Index for location-based queries
 * Enables filtering by city or country
 */
UserSchema.index({ 'profile.location.city': 1 });
UserSchema.index({ 'profile.location.country': 1 });

/**
 * 2dsphere index for geospatial queries
 * Enables location-based searches (e.g., users within X miles)
 */
UserSchema.index({ 'profile.location.geo': '2dsphere' });

/**
 * Compound index for OAuth provider lookups
 * Optimizes OAuth authentication queries
 */
UserSchema.index({ 'oauthProviders.provider': 1, 'oauthProviders.providerId': 1 });

/**
 * Index for timestamps - useful for sorting and date range queries
 */
UserSchema.index({ createdAt: -1 });
UserSchema.index({ updatedAt: -1 });

/**
 * Sparse index for soft-deleted users
 * Only indexes documents where deletedAt is not null
 * Optimizes queries that filter out deleted users
 */
UserSchema.index({ deletedAt: 1 }, { sparse: true });

// ============================================================================
// VIRTUAL PROPERTIES - Computed fields
// ============================================================================

/**
 * Virtual property: fullName
 * Concatenates firstName and lastName
 */
UserSchema.virtual('fullName').get(function () {
	return `${this.firstName} ${this.lastName}`;
});

/**
 * Virtual property: isDeleted
 * Returns true if the user has been soft-deleted
 */
UserSchema.virtual('isDeleted').get(function () {
	return this.deletedAt !== null;
});

UserSchema.virtual('publicProfileUrl').get(function () {
	return this.publicProfileUsername ? `http://localhost:3000/${this.publicProfileUsername}` : null;
});

/**
 * Virtual property: profileCompleteness
 * Calculates profile completion percentage (0-100)
 */
UserSchema.virtual('profileCompleteness').get(function () {
	let score = 0;
	const maxScore = 10;

	if (this.emailVerified) score += 1;
	if (this.profile?.headline) score += 1;
	if (this.profile?.bio) score += 1;
	if (this.profile?.avatarUrl) score += 1;
	if (this.profile?.location?.city) score += 1;
	if (this.profile?.skills && this.profile.skills.length > 0) score += 1;
	if (this.profile?.education && this.profile.education.length > 0) score += 1;
	if (this.profile?.experience && this.profile.experience.length > 0) score += 1;
	if (this.profile?.resumeId) score += 1;

	return `${Math.round((score / maxScore) * 100)}`;
});

// ============================================================================
// MIDDLEWARE - Pre and post hooks
// ============================================================================

/**
 * Pre-save middleware
 /* Ensures email is always lowercase for consistency */
UserSchema.pre('save', function (next) {
	if (this.email) {
		this.email = this.email.toLowerCase();
	}
	if (!this.publicProfileUsername && this.firstName && this.lastName) {
		const baseUsername = `${this.firstName.toLowerCase()}-${this.lastName.toLowerCase()}`
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9\-]/g, '');
		this.publicProfileUsername = `${baseUsername}-${Date.now()}`;
	}
	next();
});

/**
 * Pre-find middleware
 * Automatically exclude soft-deleted users from queries unless explicitly included
 */
UserSchema.pre(/^find/, function (this: any, next) {
	// Only apply if deletedAt is not already in the query
	if (!this.getQuery().deletedAt) {
		this.where({ deletedAt: null });
	}
	next();
});

// ============================================================================
// STATIC METHODS - Model-level methods
// ============================================================================

/**
 * Find active users by role
 * @param role - UserRole enum value
 * @returns Promise<User[]>
 */
UserSchema.statics.findActiveByRole = function (role: UserRole) {
	return this.find({ role, status: UserStatus.ACTIVE });
};

/**
 * Find users by skill
 * @param skill - Skill name
 * @returns Promise<User[]>
 */
UserSchema.statics.findBySkill = function (skill: string) {
	return this.find({ 'profile.skills': skill });
};

/**
 * Find users near a location
 * @param longitude - Longitude coordinate
 * @param latitude - Latitude coordinate
 * @param maxDistance - Maximum distance in meters (default: 50km)
 * @returns Promise<User[]>
 */
UserSchema.statics.findNearLocation = function (longitude: number, latitude: number, maxDistance = 50000) {
	return this.find({
		'profile.location.geo': {
			$near: {
				$geometry: {
					type: 'Point',
					coordinates: [longitude, latitude],
				},
				$maxDistance: maxDistance,
			},
		},
	});
};

// ============================================================================
// INSTANCE METHODS - Document-level methods
// ============================================================================

/**
 * Soft delete the user
 * Sets deletedAt timestamp instead of removing the document
 */
UserSchema.methods.softDelete = function () {
	this.deletedAt = new Date();
	return this.save();
};

/**
 * Restore a soft-deleted user
 * Removes the deletedAt timestamp
 */
UserSchema.methods.restore = function () {
	this.deletedAt = null;
	return this.save();
};

/**
 * Check if user has a specific skill
 * @param skill - Skill name to check
 * @returns boolean
 */
UserSchema.methods.hasSkill = function (skill: string): boolean {
	return this.profile?.skills?.includes(skill) || false;
};

/**
 * Add a skill to user profile
 * @param skill - Skill name to add
 * @returns Promise<User>
 */
UserSchema.methods.addSkill = function (skill: string) {
	if (!this.profile.skills) {
		this.profile.skills = [];
	}
	if (!this.profile.skills.includes(skill)) {
		this.profile.skills.push(skill);
	}
	return this.save();
};

/**
 * Remove a skill from user profile
 * @param skill - Skill name to remove
 * @returns Promise<User>
 */
UserSchema.methods.removeSkill = function (skill: string) {
	if (this.profile?.skills) {
		this.profile.skills = this.profile.skills.filter((s) => s !== skill);
	}
	return this.save();
};

export default UserSchema;
