import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Loader from './ui/Loader';

const Star = ({ filled, onClick, size = 22 }) => (
  <button type="button" onClick={onClick} className={`focus:outline-none ${onClick ? 'cursor-pointer' : 'cursor-default'}`}>
    <svg width={size} height={size} viewBox="0 0 24 24" className={filled ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-gray-300'}>
      <path stroke="currentColor" strokeWidth="1.5" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  </button>
);

const RatingStars = ({ value = 0, onChange, readonly = false }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} filled={n <= value} onClick={readonly ? undefined : () => onChange(n)} />
    ))}
  </div>
);

const ReviewItem = ({ r }) => (
  <div className="border rounded-lg p-4 bg-white shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-gray-800">{r.reviewerName || 'Reviewer'}</span>
        <p className="text-xs text-gray-400">{r.reviewerEmail ? r.reviewerEmail.replace(/(.{3})(.*)(@.*)/, '$1***$3') : ''}</p>
      </div>
      <div className="flex items-center">
        <RatingStars value={r.rating} readonly />
      </div>
    </div>
    {r.comment && <p className="mt-2 text-sm text-gray-600">{r.comment}</p>}
    <p className="mt-2 text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
  </div>
);

const ReviewPage = () => {
  const { id } = useParams();
  const { user } = useAuth(); // Correctly using AuthContext
  const [project, setProject] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2200);
  };

  const avgStars = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  const fetchAll = async () => {
    try {
      setLoading(true);

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        setErr('Project not found');
        return;
      }

      // Fetch reviews - Simple query first to ensure we get data
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        if (reviewsError.code === '42P01') {
          console.warn('Reviews table missing in database');
          setReviews([]);
        } else {
          console.error('Error fetching reviews:', reviewsError);
          setReviews([]);
        }
      } else {
        // Fetch user profiles separately to avoid JOIN issues
        const userIds = [...new Set(reviewsData.map(r => r.user_id))];
        let usersMap = {};

        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds);

          if (!usersError && usersData) {
            usersData.forEach(u => { usersMap[u.id] = u; });
          }
        }

        const formattedReviews = reviewsData.map(r => ({
          id: r.id,
          projectId: r.project_id,
          userId: r.user_id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
          // Prefer profile name, fall back to email stored in review, then Anon
          reviewerName: usersMap[r.user_id]?.name || r.user_email?.split('@')[0] || 'User',
          reviewerEmail: usersMap[r.user_id]?.email || r.user_email
        }));
        setReviews(formattedReviews);
      }

      setProject(projectData);
      setErr('');

    } catch (e) {
      console.error('Error in fetchAll:', e);
      setErr('Failed to load project or reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAll();
    }
  }, [id]);

  const submitReview = async (e) => {
    e.preventDefault();

    // Auth check using correct context
    if (!user) {
      showToast('error', 'Please log in to submit a review');
      return;
    }

    if (rating < 1 || rating > 5) {
      showToast('error', 'Please select a rating (1-5)');
      return;
    }

    setSubmitting(true);
    try {
      // Check if user already reviewed this project
      const { data: existingReview, error: existingError } = await supabase
        .from('reviews')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      // Create table check implicit in error handling
      if (existingError && existingError.code !== 'PGRST116') {
        if (existingError.code === '42P01') {
          showToast('error', 'Reviews table missing. Please contact admin.');
          setSubmitting(false);
          return;
        }
        console.error('Error checking existing review:', existingError);
      }

      if (existingReview) {
        showToast('error', 'You have already reviewed this project');
        setSubmitting(false);
        return;
      }

      // Insert review
      const reviewPayload = {
        project_id: id,
        user_id: user.id,
        user_email: user.email,
        rating: rating,
        comment: comment || "",
        created_at: new Date().toISOString(),
      };

      const { data: reviewData, error: insertError } = await supabase
        .from('reviews')
        .insert([reviewPayload])
        .select();

      if (insertError) {
        console.error('Error submitting review:', insertError);
        // Show specific error to help debugging
        if (insertError.code === '42P01') {
          showToast('error', 'Database table "reviews" is missing. Please run the SQL migration.');
        } else if (insertError.code === '42501') {
          showToast('error', 'Permission denied. RLS policy might be blocking insertion.');
        } else {
          showToast('error', `Failed to submit: ${insertError.message}`);
        }
        setSubmitting(false);
        return;
      }

      // Update project's average rating 
      const { data: allReviews, error: fetchReviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('project_id', id);

      if (!fetchReviewsError && allReviews) {
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / allReviews.length;
        const ratingsCount = allReviews.length;

        await supabase
          .from('projects')
          .update({ avgRating, ratingsCount })
          .eq('id', id);
      }

      setRating(0);
      setComment('');
      showToast('success', 'Review submitted successfully!');
      await fetchAll(); // Refresh list

    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('error', 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Loader />
    );
  }

  if (err) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg inline-block mb-4">
          {err}
        </div>
        <br />
        <Link to="/projects" className="text-indigo-600 hover:text-indigo-800 font-medium">Back to Projects</Link>
      </div>
    );
  }

  if (!project) {
    return <div className="max-w-5xl mx-auto p-6">Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg border ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            )}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6">
        <Link to="/projects" className="inline-flex items-center text-gray-500 hover:text-indigo-600 mb-6 transition-colors font-medium">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Projects
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{project.project_name || project.title || project.projectName}</h1>

              <div className="flex flex-wrap gap-2 mb-5">
                {project.domain && <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">{project.domain}</span>}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${project.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                  {project.status || 'Active'}
                </span>
              </div>

              <div className="space-y-1">
                {(project.mentor?.name || project.mentor_email || project.mentorEmail) && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span className="text-sm"><span className="font-semibold text-gray-800">Mentor:</span> {project.mentor?.name || project.mentor_email || project.mentorEmail}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  <span className="text-sm">
                    <span className="font-semibold text-gray-800">Demo Link: </span>
                    {project.demo_link ? (
                      <a href={project.demo_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                        {project.demo_link}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </span>
                </div>
                {project.deadline && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-sm"><span className="font-semibold text-gray-800">Deadline:</span> {new Date(project.deadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-gray-50 p-6 rounded-xl border border-gray-100 min-w-[140px]">
              <div className="text-5xl font-bold text-gray-900 mb-2">{avgStars.toFixed(1)}</div>
              <div className="flex items-center mb-2">
                <RatingStars value={avgStars} readonly />
              </div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}</p>
            </div>
          </div>

          {(project.project_details || project.description) && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">About Project</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{project.project_details || project.description}</p>
            </div>
          )}

          {Array.isArray(project.teamMembers) && project.teamMembers.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
              <div className="flex flex-wrap gap-4">
                {project.teamMembers.map((tm, i) => (
                  <div key={i} className="flex items-center space-x-3 bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                      {(tm.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tm.name || 'Member'}</p>
                      {tm.role && <p className="text-xs text-indigo-600 font-medium">{tm.role}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Community Reviews</h2>
              <div className="text-sm text-gray-500">
                Latest feedback from students
              </div>
            </div>

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <p className="text-gray-900 font-medium mb-1">No reviews yet</p>
                  <p className="text-sm text-gray-500">Be the first to share your experience with this project!</p>
                </div>
              ) : (
                reviews.map(r => <ReviewItem key={r.id} r={r} />)
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Write a Review</h3>
              <p className="text-sm text-gray-500 mb-6">Your feedback helps others understand the project better.</p>

              {!user ? (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6 text-center">
                  <svg className="w-10 h-10 text-indigo-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <p className="text-indigo-900 font-medium text-sm mb-4">Log in to rate and review this project</p>
                  <Link to="/login" className="inline-block w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all shadow-sm">
                    Sign In to Review
                  </Link>
                </div>
              ) : (
                <form onSubmit={submitReview} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
                    <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                      <RatingStars value={rating} onChange={setRating} size={32} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Comment <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                    <textarea
                      rows={4}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-gray-50 focus:bg-white resize-none text-sm"
                      placeholder="Share your thoughts on the project..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Publishing...
                      </span>
                    ) : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
