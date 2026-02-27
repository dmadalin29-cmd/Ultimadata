# Blog, Stories, Forum routes
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from typing import Optional
import uuid

from utils.config import db
from utils.auth import require_auth, require_admin

router = APIRouter(prefix="/api", tags=["content"])


# ===================== BLOG / GUIDES =====================

@router.get("/blog/posts")
async def get_blog_posts(
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 10
):
    """Get blog posts / guides"""
    query = {"status": "published"}
    if category:
        query["category"] = category
    
    skip = (page - 1) * limit
    posts = await db.blog_posts.find(query, {"_id": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.blog_posts.count_documents(query)
    
    return {"posts": posts, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/blog/posts/{post_id}")
async def get_blog_post(post_id: str):
    """Get single blog post"""
    post = await db.blog_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    await db.blog_posts.update_one({"post_id": post_id}, {"$inc": {"views": 1}})
    return post


@router.post("/blog/posts")
async def create_blog_post(request: Request):
    """Create blog post (admin only)"""
    user = await require_admin(request)
    body = await request.json()
    
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    
    post_doc = {
        "post_id": post_id,
        "title": body.get("title"),
        "slug": body.get("slug") or body.get("title", "").lower().replace(" ", "-")[:50],
        "content": body.get("content"),
        "excerpt": body.get("excerpt") or body.get("content", "")[:200],
        "category": body.get("category", "general"),
        "cover_image": body.get("cover_image"),
        "author_id": user["user_id"],
        "author_name": user["name"],
        "status": body.get("status", "published"),
        "views": 0,
        "tags": body.get("tags", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.blog_posts.insert_one(post_doc)
    return {"post_id": post_id, "message": "Post created successfully"}


@router.get("/blog/categories")
async def get_blog_categories():
    """Get blog categories"""
    return {
        "categories": [
            {"id": "guides", "name": "Ghiduri", "icon": "📚"},
            {"id": "tips", "name": "Sfaturi", "icon": "💡"},
            {"id": "news", "name": "Noutăți", "icon": "📰"},
            {"id": "success", "name": "Povești de Succes", "icon": "🏆"}
        ]
    }


# ===================== SUCCESS STORIES =====================

@router.get("/stories")
async def get_success_stories(page: int = 1, limit: int = 10):
    """Get success stories"""
    query = {"status": "approved"}
    skip = (page - 1) * limit
    
    stories = await db.success_stories.find(query, {"_id": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.success_stories.count_documents(query)
    
    return {"stories": stories, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.post("/stories")
async def create_success_story(request: Request):
    """Submit a success story"""
    user = await require_auth(request)
    body = await request.json()
    
    story_id = f"story_{uuid.uuid4().hex[:12]}"
    
    story_doc = {
        "story_id": story_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture"),
        "title": body.get("title"),
        "content": body.get("content"),
        "category": body.get("category"),
        "sold_item": body.get("sold_item"),
        "sold_price": body.get("sold_price"),
        "days_to_sell": body.get("days_to_sell"),
        "images": body.get("images", []),
        "status": "pending",
        "likes": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.success_stories.insert_one(story_doc)
    return {"story_id": story_id, "message": "Povestea ta a fost trimisă și așteaptă aprobarea."}


@router.post("/stories/{story_id}/like")
async def like_story(story_id: str, request: Request):
    """Like a success story"""
    user = await require_auth(request)
    
    existing = await db.story_likes.find_one({"story_id": story_id, "user_id": user["user_id"]})
    if existing:
        await db.story_likes.delete_one({"story_id": story_id, "user_id": user["user_id"]})
        await db.success_stories.update_one({"story_id": story_id}, {"$inc": {"likes": -1}})
        return {"liked": False}
    else:
        await db.story_likes.insert_one({
            "story_id": story_id,
            "user_id": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.success_stories.update_one({"story_id": story_id}, {"$inc": {"likes": 1}})
        return {"liked": True}


# ===================== FORUM =====================

@router.get("/forum/categories")
async def get_forum_categories():
    """Get forum categories"""
    return {
        "categories": [
            {"id": "general", "name": "Discuții Generale", "icon": "💬", "description": "Orice subiect legat de vânzări și cumpărări"},
            {"id": "auto", "name": "Auto & Moto", "icon": "🚗", "description": "Discuții despre mașini și motociclete"},
            {"id": "imobiliare", "name": "Imobiliare", "icon": "🏠", "description": "Sfaturi pentru vânzare/cumpărare proprietăți"},
            {"id": "electronice", "name": "Electronice", "icon": "📱", "description": "Gadgeturi și tehnologie"},
            {"id": "tips", "name": "Sfaturi & Trucuri", "icon": "💡", "description": "Cum să vinzi mai rapid"},
            {"id": "support", "name": "Suport", "icon": "🆘", "description": "Întrebări despre platformă"}
        ]
    }


@router.get("/forum/threads")
async def get_forum_threads(
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Get forum threads"""
    query = {"status": "active"}
    if category:
        query["category"] = category
    
    skip = (page - 1) * limit
    threads = await db.forum_threads.find(query, {"_id": 0}).sort([("is_pinned", -1), ("last_reply_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.forum_threads.count_documents(query)
    
    return {"threads": threads, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/forum/threads/{thread_id}")
async def get_forum_thread(thread_id: str):
    """Get forum thread with replies"""
    thread = await db.forum_threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    await db.forum_threads.update_one({"thread_id": thread_id}, {"$inc": {"views": 1}})
    replies = await db.forum_replies.find({"thread_id": thread_id}, {"_id": 0}).sort([("created_at", 1)]).to_list(100)
    
    thread["replies"] = replies
    return thread


@router.post("/forum/threads")
async def create_forum_thread(request: Request):
    """Create forum thread"""
    user = await require_auth(request)
    body = await request.json()
    
    thread_id = f"thread_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    thread_doc = {
        "thread_id": thread_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture"),
        "title": body.get("title"),
        "content": body.get("content"),
        "category": body.get("category", "general"),
        "status": "active",
        "is_pinned": False,
        "views": 0,
        "reply_count": 0,
        "last_reply_at": now,
        "created_at": now
    }
    
    await db.forum_threads.insert_one(thread_doc)
    return {"thread_id": thread_id, "message": "Thread created"}


@router.post("/forum/threads/{thread_id}/reply")
async def reply_to_thread(thread_id: str, request: Request):
    """Reply to forum thread"""
    user = await require_auth(request)
    body = await request.json()
    
    thread = await db.forum_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    reply_id = f"reply_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    reply_doc = {
        "reply_id": reply_id,
        "thread_id": thread_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture"),
        "content": body.get("content"),
        "likes": 0,
        "created_at": now
    }
    
    await db.forum_replies.insert_one(reply_doc)
    await db.forum_threads.update_one(
        {"thread_id": thread_id},
        {"$inc": {"reply_count": 1}, "$set": {"last_reply_at": now}}
    )
    
    return {"reply_id": reply_id, "message": "Reply posted"}
