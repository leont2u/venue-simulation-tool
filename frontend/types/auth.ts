export type AuthUser = {
  email:                string;
  handle?:              string;
  displayName?:         string;
  avatarUrl?:           string;
  isVerified?:          boolean;
  unreadNotifications?: number;
};

export type UserProfile = {
  id:              string;
  handle:          string;
  displayName:     string;
  bio:             string;
  avatarUrl:       string;
  location:        string;
  website:         string;
  specializations: string[];
  isVerified:      boolean;
  layoutCount:     number;
  totalForks:      number;
  totalLikes:      number;
  created_at:      string;
};

export type Notification = {
  id:          string;
  ntype:       "fork" | "like" | "approved" | "flagged" | "comment";
  is_read:     boolean;
  actorHandle: string | null;
  actorName:   string | null;
  layoutTitle: string | null;
  layoutId:    string | null;
  projectId:   string | null;
  created_at:  string;
};

export type NotificationPage = {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  Notification[];
};

export type CreatorAnalytics = {
  totals: {
    views:           number;
    uniqueViews:     number;
    forks:           number;
    saves:           number;
    likes:           number;
    layouts:         number;
    approvedLayouts: number;
  };
  layouts: Array<{
    id:               string;
    projectId:        string;
    title:            string;
    eventType:        string;
    moderationStatus: string;
    publishedAt:      string;
    views:            number;
    uniqueViews:      number;
    forks:            number;
    saves:            number;
    likes:            number;
    trendingScore:    number;
  }>;
};
