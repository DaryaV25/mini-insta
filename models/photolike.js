"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PhotoLike extends Model {
    static associate(models) {
      PhotoLike.belongsTo(models.Photo, { foreignKey: "photoId", as: "photo" });
      PhotoLike.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    }
  }

  PhotoLike.init(
    {
      photoId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: "PhotoLike",
      tableName: "PhotoLikes",
    },
  );

  return PhotoLike;
};
