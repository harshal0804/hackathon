router.put('/api/posts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, inProgressAt, resolvedAt } = req.body;

    const updateData = {
      status,
      ...(inProgressAt && { inProgressAt }),
      ...(resolvedAt && { resolvedAt })
    };

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}); 