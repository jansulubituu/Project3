'use client';

import { Star } from 'lucide-react';

interface RatingDistribution {
  _id: number;
  count: number;
}

interface RatingDisplayProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution?: RatingDistribution[];
}

export default function RatingDisplay({ averageRating, totalReviews, ratingDistribution }: RatingDisplayProps) {
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${sizeClasses[size]} ${
          i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
        }`}
      />
    ));
  };

  // Create distribution map
  const distributionMap: Record<number, number> = {};
  if (ratingDistribution) {
    ratingDistribution.forEach((item) => {
      distributionMap[item._id] = item.count;
    });
  }

  // Get count for each rating (1-5)
  const getCount = (rating: number) => distributionMap[rating] || 0;
  const getPercentage = (rating: number) => {
    if (totalReviews === 0) return 0;
    return (getCount(rating) / totalReviews) * 100;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Average Rating */}
        <div className="flex-shrink-0 text-center md:text-left">
          <div className="text-5xl font-bold text-gray-900 mb-2">{averageRating.toFixed(1)}</div>
          <div className="flex items-center justify-center md:justify-start space-x-1 mb-2">
            {renderStars(averageRating, 'lg')}
          </div>
          <div className="text-sm text-gray-600">
            {totalReviews} {totalReviews === 1 ? 'đánh giá' : 'đánh giá'}
          </div>
        </div>

        {/* Rating Distribution */}
        {totalReviews > 0 && (
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = getCount(rating);
              const percentage = getPercentage(rating);
              return (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 w-16">
                    <span className="text-sm font-medium text-gray-700">{rating}</span>
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 w-12 text-right">{count}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


