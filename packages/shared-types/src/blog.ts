export interface BlogPost {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  imageUrl?: string;
  categories?: string[];
  authorId?: string;
  authorName?: string;
  publishedAt?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface BlogFormValues {
  title: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  categories: string[];
  slug?: string;
}