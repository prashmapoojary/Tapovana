const https = require('https');

// Curated stock images from Unsplash (categorized by keywords)
const CURATED_IMAGES = {
    yoga: [
        {
            id: "yoga-1",
            url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
            description: "Person practicing yoga cobra pose",
            author: "An挑戰"
        },
        {
            id: "yoga-2",
            url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800",
            description: "Meditation yoga pose at sunset beach",
            author: "Jared Rice"
        },
        {
            id: "yoga-3",
            url: "https://images.unsplash.com/photo-1510894347713-fc3ed6ecdd06?auto=format&fit=crop&q=80&w=800",
            description: "Group practicing yoga in a bright studio",
            author: "Rishabh Varshney"
        },
        {
            id: "yoga-4",
            url: "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&q=80&w=800",
            description: "Advanced stretching yoga pose on mat",
            author: "Dane Wetton"
        },
        {
            id: "yoga-5",
            url: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=800",
            description: "Child's pose relaxation on yoga mat",
            author: "Kike Vega"
        },
        {
            id: "yoga-6",
            url: "https://images.unsplash.com/photo-1603988363607-e1e4a66962c6?auto=format&fit=crop&q=80&w=800",
            description: "Morning stretching routine outdoors",
            author: "Kaylee Garrett"
        },
        {
            id: "yoga-7",
            url: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&q=80&w=800",
            description: "Zen meditation pose against lake",
            author: "JD Mason"
        },
        {
            id: "yoga-8",
            url: "https://images.unsplash.com/photo-1602192509154-0b900ee1f851?auto=format&fit=crop&q=80&w=800",
            description: "Yoga flow pose in forest setting",
            author: "Carl Barcelo"
        }
    ],
    meditation: [
        {
            id: "meditation-1",
            url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800",
            description: "Deep breathing meditation pose",
            author: "Jared Rice"
        },
        {
            id: "meditation-2",
            url: "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&q=80&w=800",
            description: "Peaceful forest walk mindfulness",
            author: "Sébastien Marchand"
        },
        {
            id: "meditation-3",
            url: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=800",
            description: "Candles and incense setup for zen meditation",
            author: "Hans Vivek"
        },
        {
            id: "meditation-4",
            url: "https://images.unsplash.com/photo-1536620605510-d85c4e30024e?auto=format&fit=crop&q=80&w=800",
            description: "Tibetan singing bowl sound therapy",
            author: "Sven Mieke"
        },
        {
            id: "meditation-5",
            url: "https://images.unsplash.com/photo-1528319725582-ddc096101511?auto=format&fit=crop&q=80&w=800",
            description: "Silent retreat sitting in garden",
            author: "Dingzeyu Li"
        },
        {
            id: "meditation-6",
            url: "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=800",
            description: "Stargazing at night mindfulness session",
            author: "Vincent Ledvina"
        }
    ],
    massage: [
        {
            id: "massage-1",
            url: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800",
            description: "Relaxing back massage with oils at luxury spa",
            author: "Raza Ali"
        },
        {
            id: "massage-2",
            url: "https://images.unsplash.com/photo-1542848284-8afd7ff19889?auto=format&fit=crop&q=80&w=800",
            description: "Aromatherapy massage oil bottles and herbs",
            author: "Pratiksha Mohanty"
        },
        {
            id: "massage-3",
            url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800",
            description: "Face massage and skin treatment",
            author: "Valeriia Harchenko"
        },
        {
            id: "massage-4",
            url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800",
            description: "Hot stone therapy on back at spa center",
            author: "Esther Tuttle"
        },
        {
            id: "massage-5",
            url: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800",
            description: "Ayurvedic massage herbs and oils setup",
            author: "Katherine Karas"
        },
        {
            id: "massage-6",
            url: "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=800",
            description: "Therapist massage treatment room",
            author: "Nigel Tadyanehondo"
        }
    ],
    ayurveda: [
        {
            id: "ayurveda-1",
            url: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=800",
            description: "Traditional Indian herbs, ginger, turmeric root",
            author: "Anoop"
        },
        {
            id: "ayurveda-2",
            url: "https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&q=80&w=800",
            description: "Ayurvedic powder mix and mortar pestle",
            author: "Devi"
        },
        {
            id: "ayurveda-3",
            url: "https://images.unsplash.com/photo-1563483783225-be53c907cf7c?auto=format&fit=crop&q=80&w=800",
            description: "Pouring Ayurvedic herbal oil into a bowl",
            author: "Sanket"
        },
        {
            id: "ayurveda-4",
            url: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800",
            description: "Raw roots, spices and dry herbs",
            author: "Katherine Karas"
        },
        {
            id: "ayurveda-5",
            url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800",
            description: "Herbal tea with mint and chamomile flowers",
            author: "Monika Grabkowska"
        },
        {
            id: "ayurveda-6",
            url: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800",
            description: "Mortar and pestle grinding fresh green herbs",
            author: "Tiard"
        }
    ],
    nutrition: [
        {
            id: "nutrition-1",
            url: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=800",
            description: "Healthy salad bowl with colorful vegetables",
            author: "Brooke Lark"
        },
        {
            id: "nutrition-2",
            url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
            description: "Superfood bowl with avocado, greens and seeds",
            author: "Nathan Dumlao"
        },
        {
            id: "nutrition-3",
            url: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800",
            description: "Raw fruits, veggies and health ingredients table",
            author: "Ella Olsson"
        },
        {
            id: "nutrition-4",
            url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800",
            description: "Greek salad with olive oil dressing",
            author: "Dani Rendina"
        },
        {
            id: "nutrition-5",
            url: "https://images.unsplash.com/photo-1610970881699-44a5587caaec?auto=format&fit=crop&q=80&w=800",
            description: "Detox green smoothie jar and cucumbers",
            author: "Vitalii Pavlyshynets"
        }
    ],
    hair: [
        {
            id: "hair-1",
            url: "https://images.unsplash.com/photo-1560869713-7d0a29430f33?auto=format&fit=crop&q=80&w=800",
            description: "Hair styling salon treatment washing",
            author: "Giorgio Trovato"
        },
        {
            id: "hair-2",
            url: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&q=80&w=800",
            description: "Haircut scissor trim at professional salon",
            author: "Gregory Hayes"
        },
        {
            id: "hair-3",
            url: "https://images.unsplash.com/photo-1605497746444-ac9db450fcc7?auto=format&fit=crop&q=80&w=800",
            description: "Beautiful hair extensions coloring",
            author: "Shari Sirotnak"
        }
    ],
    nail: [
        {
            id: "nail-1",
            url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800",
            description: "Fresh manicure nail polish application",
            author: "Krisztina Papp"
        },
        {
            id: "nail-2",
            url: "https://images.unsplash.com/photo-1632345031435-8797b2d58045?auto=format&fit=crop&q=80&w=800",
            description: "Luxury pedicure spa treatment for feet",
            author: "Raza Ali"
        }
    ],
    general: [
        {
            id: "general-1",
            url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800",
            description: "Mindfulness and wellness meditation outdoor",
            author: "Jared Rice"
        },
        {
            id: "general-2",
            url: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=800",
            description: "Zen room with candles, mats and wellness vibe",
            author: "Hans Vivek"
        },
        {
            id: "general-3",
            url: "https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&q=80&w=800",
            description: "Spring flowers nature landscape",
            author: "Filip Zrnzević"
        },
        {
            id: "general-4",
            url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=800",
            description: "Sunlight shining through forest trees",
            author: "Veeterzy"
        },
        {
            id: "general-5",
            url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800",
            description: "Green trees in tall forest",
            author: "Sebastian Unrau"
        },
        {
            id: "general-6",
            url: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&q=80&w=800",
            description: "Sunrise over foggy valley forest landscape",
            author: "Clay Banks"
        }
    ]
};

// Curated stock videos (Pexels compatible sd.mp4 links)
const CURATED_VIDEOS = {
    yoga: [
        {
            id: "vid-yoga-1",
            url: "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273f60f6efec27c02c6cbb030226&profile_id=139&oauth2_token_id=57447761",
            image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
            description: "Woman practicing Yoga vinyasa flow stretches on wooden floor",
            author: "Pexels Video"
        },
        {
            id: "vid-yoga-2",
            url: "https://player.vimeo.com/external/435674703.sd.mp4?s=6f41161d15d5d85d7790cd5db0b5b15806e00ea0&profile_id=165&oauth2_token_id=57447761",
            image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800",
            description: "Stretching and meditation session outdoor during morning sunrise",
            author: "Pexels Video"
        },
        {
            id: "vid-yoga-3",
            url: "https://player.vimeo.com/external/384761655.sd.mp4?s=34bf16fa2e7d704fc1929fbda4570ff2a7e786b5&profile_id=165&oauth2_token_id=57447761",
            image: "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&q=80&w=800",
            description: "Studio class yoga practicing group stretching pose",
            author: "Pexels Video"
        }
    ],
    meditation: [
        {
            id: "vid-meditation-1",
            url: "https://player.vimeo.com/external/485603224.sd.mp4?s=c8ffcf86050b1a03e2c21966a3ea66453d85834b&profile_id=165&oauth2_token_id=57447761",
            image: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=800",
            description: "Tibetan bowl sound bath and spiritual incense smoke",
            author: "Pexels Video"
        },
        {
            id: "vid-meditation-2",
            url: "https://player.vimeo.com/external/517600864.sd.mp4?s=4a3d8206d2c4cf2ea14f5cfb5840d2cdbbaea9ef&profile_id=165&oauth2_token_id=57447761",
            image: "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&q=80&w=800",
            description: "Close-up of burning incense stick and candle zen light",
            author: "Pexels Video"
        }
    ],
    therapy: [
        {
            id: "vid-therapy-1",
            url: "https://player.vimeo.com/external/409228833.sd.mp4?s=c130ef7cae617d9282fa2c92e76f6c91e138ee4e&profile_id=165&oauth2_token_id=57447761",
            image: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800",
            description: "Oil massage therapy on arm at luxury wellness center",
            author: "Pexels Video"
        }
    ],
    general: [
        {
            id: "vid-general-1",
            url: "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273f60f6efec27c02c6cbb030226&profile_id=139&oauth2_token_id=57447761",
            image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
            description: "Relaxing wellness stream flow",
            author: "Pexels Video"
        }
    ]
};

// Search Unsplash images
const searchImages = async (req, res) => {
    const query = (req.query.query || 'wellness').trim().toLowerCase();
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

    if (unsplashKey) {
        // Fetch from official Unsplash API
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30`;
        https.get(url, {
            headers: {
                'Authorization': `Client-ID ${unsplashKey}`
            }
        }, (apiRes) => {
            let data = '';
            apiRes.on('data', (chunk) => data += chunk);
            apiRes.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const images = (result.results || []).map(img => ({
                        id: img.id,
                        url: img.urls.regular,
                        download_url: img.links.download,
                        description: img.description || img.alt_description || "Stock Image",
                        author: img.user?.name || "Unsplash Author",
                        source: 'unsplash'
                    }));
                    return res.json({ success: true, images });
                } catch (e) {
                    console.error("[Unsplash API Error] Fallback triggered due to parsing failure:", e.message);
                    return serveCuratedImages(query, res);
                }
            });
        }).on('error', (err) => {
            console.error("[Unsplash API Connection Error] Fallback triggered:", err.message);
            return serveCuratedImages(query, res);
        });
    } else {
        // Fallback to local curated list
        return serveCuratedImages(query, res);
    }
};

// Search Pexels videos
const searchVideos = async (req, res) => {
    const query = (req.query.query || 'yoga').trim().toLowerCase();
    const pexelsKey = process.env.PEXELS_API_KEY;

    if (pexelsKey) {
        // Fetch from Pexels API
        const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=15`;
        https.get(url, {
            headers: {
                'Authorization': pexelsKey
            }
        }, (apiRes) => {
            let data = '';
            apiRes.on('data', (chunk) => data += chunk);
            apiRes.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const videos = (result.videos || []).map(vid => {
                        // Find sd mp4 file link
                        const sdFile = vid.video_files.find(vf => vf.quality === 'sd' || vf.link.includes('sd')) || vid.video_files[0];
                        return {
                            id: vid.id,
                            url: sdFile ? sdFile.link : null,
                            image: vid.image,
                            description: `Pexels Stock Video by ${vid.user?.name || 'Author'}`,
                            author: vid.user?.name || "Pexels Creator",
                            source: 'pexels'
                        };
                    }).filter(v => v.url);
                    return res.json({ success: true, videos });
                } catch (e) {
                    console.error("[Pexels API Error] Fallback triggered:", e.message);
                    return serveCuratedVideos(query, res);
                }
            });
        }).on('error', (err) => {
            console.error("[Pexels API Connection Error] Fallback triggered:", err.message);
            return serveCuratedVideos(query, res);
        });
    } else {
        // Fallback to local curated list
        return serveCuratedVideos(query, res);
    }
};

// Helper to filter and return local curated images
function serveCuratedImages(query, res) {
    let category = 'general';
    
    // Simple query matching
    if (query.match(/yoga|vinyasa|asana|pose|mat|stretch/)) {
        category = 'yoga';
    } else if (query.match(/meditat|breath|pranayama|calm|zen|mindful|silent/)) {
        category = 'meditation';
    } else if (query.match(/ayurveda|herb|oil|detox|panchakarma|potion|nature/)) {
        category = 'ayurveda';
    } else if (query.match(/massage|spa|therap|hot stone|facial|skin/)) {
        category = 'massage';
    } else if (query.match(/food|nutrit|diet|eat|salad|smoothie|healthy/)) {
        category = 'nutrition';
    } else if (query.match(/hair|salon|barber/)) {
        category = 'hair';
    } else if (query.match(/nail|manicure|pedicure/)) {
        category = 'nail';
    }

    let results = CURATED_IMAGES[category] || CURATED_IMAGES.general;

    // If query doesn't match category, scan descriptions across all categories for matches
    if (category === 'general' && query !== 'wellness') {
        const allList = Object.values(CURATED_IMAGES).flat();
        const matches = allList.filter(img => 
            img.description.toLowerCase().includes(query) || 
            img.id.toLowerCase().includes(query)
        );
        if (matches.length > 0) {
            results = matches;
        }
    }

    return res.json({ success: true, images: results });
}

// Helper to filter and return local curated videos
function serveCuratedVideos(query, res) {
    let category = 'general';

    if (query.match(/yoga|vinyasa|asana|pose|stretch/)) {
        category = 'yoga';
    } else if (query.match(/meditat|breath|calm|zen|sound/)) {
        category = 'meditation';
    } else if (query.match(/massage|spa|therap|oil/)) {
        category = 'therapy';
    }

    let results = CURATED_VIDEOS[category] || CURATED_VIDEOS.general;

    if (category === 'general' && query !== 'yoga') {
        const allList = Object.values(CURATED_VIDEOS).flat();
        const matches = allList.filter(vid => 
            vid.description.toLowerCase().includes(query)
        );
        if (matches.length > 0) {
            results = matches;
        }
    }

    return res.json({ success: true, videos: results });
}

module.exports = {
    searchImages,
    searchVideos
};
